import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const trackedFiles = execFileSync("git", ["ls-files", "-z"])
  .toString("utf8")
  .split("\0")
  .filter(Boolean);

const skip = (path) =>
  /(?:^|\/)(?:pnpm-lock\.yaml|Cargo\.lock)$/.test(path)
  || /\.(?:jpg|jpeg|png|gif|webp|ico|woff2?)$/i.test(path);

const placeholder = (value) =>
  !value
  || /^(?:your|example|placeholder|changeme|replace|test|dummy|none|null|empty|xxx|<)/i.test(value)
  || /YOUR[_-]/i.test(value);

const rules = [
  { name: "JWT-like secret", pattern: /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b/g },
  { name: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "RPC API key", pattern: /api[-_]?key=([A-Za-z0-9_-]{20,})/gi, capture: 1 },
  {
    name: "assigned backend secret",
    pattern: /^(?:KEEPER_(?:PRIVATE_KEY|KEYPAIR_BASE64)|PUMP_CREATOR_(?:PRIVATE_KEY|KEYPAIR_BASE64)|SESSION_SECRET|SUPABASE_SECRET_KEY)\s*=\s*["']?([^\s"'#]+)/gim,
    capture: 1,
  },
];

const findings = [];
for (const path of trackedFiles) {
  if (skip(path) || !existsSync(path)) continue;
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  const text = bytes.toString("utf8");
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of text.matchAll(rule.pattern)) {
      const candidate = match[rule.capture ?? 0];
      if (placeholder(candidate)) continue;
      const line = text.slice(0, match.index).split("\n").length;
      findings.push(`${path}:${line} (${rule.name})`);
    }
  }
}

if (findings.length) {
  console.error("Potential secrets detected. Values are intentionally redacted:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("Secret scan passed.");
}
