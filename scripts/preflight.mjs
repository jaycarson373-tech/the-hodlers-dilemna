import { readFile } from "node:fs/promises";
import process from "node:process";

const failures = [];
const warnings = [];
const args = process.argv.slice(2);
const live = args.includes("--live");

const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const normalizeApiUrl = (value = "") => {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const absolute = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return absolute.replace(/\/api$/i, "");
};

const safeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return "configured endpoint";
  }
};

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function checkStaticConfiguration() {
  const [packageJson, railway, vercel, dockerfile] = await Promise.all([
    readJson("package.json"),
    readJson("railway.json"),
    readJson("vercel.json"),
    readFile("Dockerfile", "utf8"),
  ]);

  if (packageJson.packageManager !== "pnpm@10.14.0") {
    failures.push("package.json must pin pnpm@10.14.0.");
  }
  if (packageJson.scripts?.build?.includes("RAILWAY_ENVIRONMENT")) {
    failures.push("The website build must not change behavior when Railway variables exist.");
  }
  if (railway.build?.builder !== "DOCKERFILE" || railway.build?.dockerfilePath !== "Dockerfile") {
    failures.push("railway.json must use the repository-root Dockerfile.");
  }
  if (railway.deploy?.healthcheckPath !== "/health/ready") {
    failures.push("Railway must gate deploys on /health/ready.");
  }
  if (vercel.buildCommand !== "pnpm run build:vercel") {
    failures.push("Vercel must use the tested build:vercel script.");
  }
  if (!dockerfile.includes("pnpm install --frozen-lockfile")) {
    failures.push("Dockerfile dependencies must be installed from the committed lockfile.");
  }
  if (/^RUN\s+npm\s+install\b/m.test(dockerfile)) {
    failures.push("Dockerfile must not mix npm with the pnpm lockfile.");
  }

  try {
    await readFile("railway/railway.toml", "utf8");
    failures.push("Remove railway/railway.toml; it creates a second, conflicting deployment path.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function fetchJson(url, init) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(8_000),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function checkLiveApi(rawApiUrl) {
  const apiUrl = normalizeApiUrl(rawApiUrl);
  if (!apiUrl) {
    failures.push("NEXT_PUBLIC_API_URL or --api is required for --live.");
    return;
  }

  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch {
    failures.push("NEXT_PUBLIC_API_URL is not a valid URL or hostname.");
    return;
  }

  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    failures.push("The production API URL must use HTTPS.");
  }
  if (rawApiUrl.trim() !== apiUrl) {
    warnings.push("The API URL needed normalization; store the normalized HTTPS service root in Vercel.");
  }

  const origin = safeOrigin(apiUrl);
  try {
    const { response: liveResponse, body: liveBody } = await fetchJson(`${apiUrl}/health/live`);
    if (!liveResponse.ok || liveBody?.ok !== true) failures.push(`API liveness failed at ${origin}.`);

    const { response: readyResponse, body: readyBody } = await fetchJson(`${apiUrl}/health/ready`);
    if (!readyResponse.ok || readyBody?.ok !== true) {
      const failedChecks = Object.entries(readyBody?.checks ?? {})
        .filter(([, value]) => !value)
        .map(([name]) => name);
      failures.push(`API readiness failed${failedChecks.length ? `: ${failedChecks.join(", ")}` : ` at ${origin}`}.`);
    }

    const { response: statusResponse, body: statusBody } = await fetchJson(`${apiUrl}/api/status`);
    if (!statusResponse.ok || statusBody?.configured !== true) failures.push("Game status is not configured.");
    const nextRoundAt = statusBody?.nextRoundAt ? new Date(statusBody.nextRoundAt).getTime() : 0;
    if (
      statusBody?.configured === true
      && statusBody?.paused !== true
      && statusBody?.roundActive !== true
      && nextRoundAt < Date.now() - 60_000
    ) {
      failures.push("Round scheduler is overdue: the keeper is not advancing the game.");
    }

    for (const path of ["/api/events", "/api/leaderboard"]) {
      const { response, body } = await fetchJson(`${apiUrl}${path}`);
      if (!response.ok || !Array.isArray(body)) {
        failures.push(`${path} failed; the Supabase game schema is incomplete or inaccessible.`);
      }
    }

    const wallet = "11111111111111111111111111111111";
    const { response: authResponse, body: authBody } = await fetchJson(`${apiUrl}/api/auth/challenge?wallet=${wallet}`);
    if (!authResponse.ok || typeof authBody?.message !== "string") failures.push("Wallet sign-in challenge route failed.");

    const siteOrigin = option("--origin") ?? process.env.SITE_ORIGIN;
    if (siteOrigin) {
      const corsResponse = await fetch(`${apiUrl}/api/auth/challenge`, {
        method: "OPTIONS",
        headers: { Origin: siteOrigin },
        signal: AbortSignal.timeout(8_000),
      });
      if (corsResponse.headers.get("access-control-allow-origin") !== siteOrigin) {
        failures.push("API CORS does not allow the configured site origin.");
      }
    }
  } catch {
    failures.push(`Could not reach the API at ${origin}.`);
  }
}

await checkStaticConfiguration();

const apiUrl = option("--api") ?? process.env.NEXT_PUBLIC_API_URL ?? "";
if (live) await checkLiveApi(apiUrl);

for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(live ? "Preflight passed: deployment config and live wallet API are ready." : "Preflight passed: one canonical Vercel/Railway deployment path is configured.");
}
