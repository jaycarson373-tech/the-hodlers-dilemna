import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import express, { type NextFunction, type Request, type Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import { jwtVerify, SignJWT } from "jose";
import nacl from "tweetnacl";
import { z } from "zod";

type PumpSdkClient = {
  getCreatorVaultBalanceBothPrograms(creator: PublicKey): Promise<{ toString(): string }>;
  collectCoinCreatorFeeInstructions(creator: PublicKey, payer: PublicKey): Promise<TransactionInstruction[]>;
};

const nodeRequire = createRequire(import.meta.url);
const { OnlinePumpSdk } = nodeRequire("@pump-fun/pump-sdk") as {
  OnlinePumpSdk: new (connection: Connection) => PumpSdkClient;
};

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SITE_ORIGIN: z.string().url().default("http://localhost:3000"),
  SOLANA_RPC_URL: z.string().url().default("https://api.mainnet-beta.solana.com"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  KEEPER_PRIVATE_KEY: z.string().optional(),
  KEEPER_KEYPAIR_BASE64: z.string().optional(),
  PUMP_CREATOR_PRIVATE_KEY: z.string().optional(),
  PUMP_CREATOR_KEYPAIR_BASE64: z.string().optional(),
  FEE_COLLECTION_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  ROUND_LENGTH_SECONDS: z.coerce.number().int().positive().default(1_800),
  CLAIM_WINDOW_SECONDS: z.coerce.number().int().positive().default(604_800),
  DEFECT_THRESHOLD_BPS: z.coerce.number().int().min(1).max(10_000).default(5_000),
  DEFECTOR_BONUS_BPS: z.coerce.number().int().min(10_000).max(100_000).default(15_000),
  MIN_HOLDING_TOKENS: z.string().regex(/^\d+(\.\d+)?$/).default("500000"),
  TOKEN_MINT: z.string().optional(),
  INITIAL_ADMIN: z.string().optional(),
});

const env = envSchema.parse(process.env);
const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
const clusterName = "mainnet-beta";
const sessionKey = env.SESSION_SECRET ? new TextEncoder().encode(env.SESSION_SECRET) : undefined;
const tokenMint = env.TOKEN_MINT ? new PublicKey(env.TOKEN_MINT) : undefined;
const supabase: SupabaseClient | undefined = env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : undefined;

const keypairWarnings: string[] = [];

function tokenAmountStringToBaseUnits(value: string, decimals: number) {
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) {
    throw new Error(`MIN_HOLDING_TOKENS supports at most ${decimals} decimal places for this mint.`);
  }
  const units = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  return BigInt(units || "0");
}

function secretFromBytes(bytes: Uint8Array) {
  if (bytes.length !== 64) throw new Error(`Expected 64 secret-key bytes, received ${bytes.length}.`);
  return Keypair.fromSecretKey(bytes);
}

function parseKeypairValue(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    return secretFromBytes(Uint8Array.from(JSON.parse(trimmed) as number[]));
  }

  const decodedBase64 = Buffer.from(trimmed, "base64");
  if (decodedBase64[0] === 91) {
    return secretFromBytes(Uint8Array.from(JSON.parse(decodedBase64.toString("utf8")) as number[]));
  }
  if (decodedBase64.length === 64) return secretFromBytes(Uint8Array.from(decodedBase64));

  const decodedBase58 = bs58.decode(trimmed);
  return secretFromBytes(decodedBase58);
}

function optionalKeypair(name: string, value?: string) {
  if (!value) return undefined;
  try {
    return parseKeypairValue(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid keypair.";
    keypairWarnings.push(`${name}: ${message}`);
    return undefined;
  }
}

const keeperPrivateKey = env.KEEPER_PRIVATE_KEY ?? env.KEEPER_KEYPAIR_BASE64;
const pumpCreatorPrivateKey = env.PUMP_CREATOR_PRIVATE_KEY ?? env.PUMP_CREATOR_KEYPAIR_BASE64;
const keeper = optionalKeypair("KEEPER_PRIVATE_KEY", keeperPrivateKey);
const pumpCreator = optionalKeypair("PUMP_CREATOR_PRIVATE_KEY", pumpCreatorPrivateKey);
const payoutWallet = pumpCreator ?? keeper;
const pumpSdk = new OnlinePumpSdk(connection);

type DbConfig = {
  program_id?: string;
  token_mint?: string;
  cluster?: string;
  current_round: number | string;
  available_pool_lamports: number | string;
  round_length_seconds: number | string;
  claim_window_seconds: number | string;
  defect_threshold_bps: number;
  defector_bonus_bps: number;
  next_round_at: string | null;
  round_active: boolean;
  paused: boolean;
};

type DbRound = {
  round_number: number | string;
  status: "open" | "settled" | "rolled_over" | "closed";
  opened_at: string;
  closes_at: string;
  claim_deadline: string | null;
  pot_lamports: number | string;
  remaining_lamports: number | string;
  cooperate_weight: number | string;
  defect_weight: number | string;
  distribution_weight: number | string;
  voter_count: number;
};

type DbHolder = {
  wallet: string;
  position_amount: number | string;
  streak_started_at: string | null;
  last_withdraw_at: string | null;
  bonus_bps: number;
  tier: number;
  cooperate_votes: number;
  defect_votes: number;
};

const nonces = new Map<string, { nonce: string; expiresAt: number }>();
let keeperBusy = false;
let feeCollectorBusy = false;

const nowIso = () => new Date().toISOString();
const addSeconds = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000).toISOString();
const bigintValue = (value: unknown) => BigInt(String(value ?? "0"));
const iso = (value?: string | null) => value ?? null;
const tierName = (tier: number) => ["Paper Hands", "Iron Hands", "Diamond Hands", "Obsidian Hands"][tier] ?? "Paper Hands";
const publicErrorMessage = (message: string) => {
  if (/supabase|token_mint|database|configured|configuration|column|relation|schema|railway|api|rpc|keypair|private|secret/i.test(message)) {
    return "The Banker is preparing the first round. Try again in a moment.";
  }
  return message;
};

function requireDb() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

async function authenticate(req: Request) {
  if (!sessionKey) throw new Error("Wallet authentication is not configured.");
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Wallet sign-in is required.");
  const { payload } = await jwtVerify(token, sessionKey, { issuer: "hodlornohodl.fun", audience: "game" });
  if (typeof payload.sub !== "string") throw new Error("Invalid wallet session.");
  return payload.sub;
}

async function requireSameWallet(req: Request, expected: string) {
  const authenticated = await authenticate(req);
  if (new PublicKey(authenticated).toBase58() !== new PublicKey(expected).toBase58()) {
    throw new Error("Wallet session does not match.");
  }
}

async function tokenSupplyDecimals() {
  if (!tokenMint) return 6;
  const supply = await connection.getTokenSupply(tokenMint, "confirmed");
  return supply.value.decimals;
}

async function walletTokenBalance(wallet: PublicKey) {
  if (!tokenMint) return { amount: 0n, decimals: 6 };
  const account = getAssociatedTokenAddressSync(tokenMint, wallet, false, TOKEN_PROGRAM_ID);
  const balance = await connection.getTokenAccountBalance(account, "confirmed").catch(() => null);
  return {
    amount: BigInt(balance?.value.amount ?? "0"),
    decimals: balance?.value.decimals ?? await tokenSupplyDecimals(),
  };
}

function minimumHoldingBaseUnits(decimals: number) {
  return tokenAmountStringToBaseUnits(env.MIN_HOLDING_TOKENS, decimals);
}

function multiplierBps(streakStartedAt: string | null) {
  if (!streakStartedAt) return 10_000;
  const days = Math.max(0, Math.floor((Date.now() - new Date(streakStartedAt).getTime()) / 86_400_000));
  if (days >= 14) return 30_000;
  if (days >= 7) return 20_000;
  if (days >= 3) return 15_000;
  return 10_000;
}

function tierFor(streakStartedAt: string | null) {
  if (!streakStartedAt) return 0;
  const days = Math.max(0, Math.floor((Date.now() - new Date(streakStartedAt).getTime()) / 86_400_000));
  if (days >= 30) return 3;
  if (days >= 14) return 2;
  if (days >= 3) return 1;
  return 0;
}

async function ensureGameConfig() {
  const db = requireDb();
  if (!tokenMint) throw new Error("TOKEN_MINT is not configured.");

  const { data, error } = await db.from("protocol_config").select("*").eq("id", true).maybeSingle<DbConfig>();
  if (error) throw error;
  if (data) {
    const updates: Partial<DbConfig> & { updated_at?: string } = {};
    if (data.program_id !== "supabase-mainnet-game") updates.program_id = "supabase-mainnet-game";
    if (data.token_mint !== tokenMint.toBase58()) updates.token_mint = tokenMint.toBase58();
    if (data.cluster !== clusterName) updates.cluster = clusterName;
    if (!data.round_length_seconds) updates.round_length_seconds = env.ROUND_LENGTH_SECONDS.toString();
    if (!data.claim_window_seconds) updates.claim_window_seconds = env.CLAIM_WINDOW_SECONDS.toString();
    if (!data.defect_threshold_bps) updates.defect_threshold_bps = env.DEFECT_THRESHOLD_BPS;
    if (!data.defector_bonus_bps) updates.defector_bonus_bps = env.DEFECTOR_BONUS_BPS;
    if (!data.next_round_at) updates.next_round_at = nowIso();
    if (Object.keys(updates).length) {
      updates.updated_at = nowIso();
      const { data: updated, error: updateError } = await db
        .from("protocol_config")
        .update(updates)
        .eq("id", true)
        .select("*")
        .single<DbConfig>();
      if (updateError) throw updateError;
      return updated;
    }
    return data;
  }

  const created = {
    id: true,
    program_id: "supabase-mainnet-game",
    token_mint: tokenMint.toBase58(),
    cluster: clusterName,
    current_round: "0",
    available_pool_lamports: "0",
    round_length_seconds: env.ROUND_LENGTH_SECONDS.toString(),
    claim_window_seconds: env.CLAIM_WINDOW_SECONDS.toString(),
    defect_threshold_bps: env.DEFECT_THRESHOLD_BPS,
    defector_bonus_bps: env.DEFECTOR_BONUS_BPS,
    next_round_at: nowIso(),
    round_active: false,
    paused: false,
    updated_at: nowIso(),
  };
  const { data: inserted, error: insertError } = await db
    .from("protocol_config")
    .insert(created)
    .select("*")
    .single<DbConfig>();
  if (insertError) throw insertError;
  await db.from("protocol_events").insert({
    event_type: "GAME_INITIALIZED",
    detail: `Mainnet game initialized for ${tokenMint.toBase58()}.`,
  });
  return inserted;
}

async function fetchCurrentRound(config: DbConfig) {
  const current = bigintValue(config.current_round);
  if (current <= 0n) return null;
  const db = requireDb();
  const { data, error } = await db
    .from("rounds")
    .select("*")
    .eq("round_number", current.toString())
    .maybeSingle<DbRound>();
  if (error) throw error;
  return data;
}

function publicRound(round: DbRound | null) {
  if (!round) return null;
  const cooperate = bigintValue(round.cooperate_weight);
  const defect = bigintValue(round.defect_weight);
  const total = cooperate + defect;
  const cooperatePercent = total === 0n ? 50 : Number((cooperate * 10_000n) / total) / 100;
  return {
    roundNumber: String(round.round_number),
    openedAt: iso(round.opened_at),
    closesAt: iso(round.closes_at),
    claimDeadline: iso(round.claim_deadline),
    potLamports: String(round.pot_lamports),
    remainingLamports: String(round.remaining_lamports),
    cooperateWeight: cooperate.toString(),
    defectWeight: defect.toString(),
    cooperatePercent,
    defectPercent: 100 - cooperatePercent,
    voterCount: round.voter_count,
    status: round.status,
  };
}

async function syncHolder(wallet: PublicKey) {
  const db = requireDb();
  const balance = await walletTokenBalance(wallet);
  const minimumHolding = minimumHoldingBaseUnits(balance.decimals);
  const eligibleAmount = balance.amount >= minimumHolding ? balance.amount : 0n;
  const walletAddress = wallet.toBase58();
  const { data: existing, error } = await db
    .from("holders")
    .select("*")
    .eq("wallet", walletAddress)
    .maybeSingle<DbHolder>();
  if (error) throw error;

  const previousAmount = bigintValue(existing?.position_amount);
  const soldOrDropped = eligibleAmount > 0n && existing && previousAmount > eligibleAmount;
  const entered = eligibleAmount > 0n && (!existing || previousAmount === 0n || !existing.streak_started_at);
  const streakStartedAt = eligibleAmount === 0n
    ? null
    : soldOrDropped || entered
      ? nowIso()
      : existing?.streak_started_at ?? nowIso();
  const tier = tierFor(streakStartedAt);
  const bonusBps = Math.max(0, multiplierBps(streakStartedAt) - 10_000);

  const row = {
    wallet: walletAddress,
    position_amount: eligibleAmount.toString(),
    streak_started_at: streakStartedAt,
    last_withdraw_at: soldOrDropped ? nowIso() : existing?.last_withdraw_at ?? null,
    bonus_bps: bonusBps,
    tier,
    cooperate_votes: existing?.cooperate_votes ?? 0,
    defect_votes: existing?.defect_votes ?? 0,
    updated_at: nowIso(),
  };

  const { error: upsertError } = await db.from("holders").upsert(row);
  if (upsertError) throw upsertError;

  const streakSeconds = streakStartedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(streakStartedAt).getTime()) / 1000))
    : 0;

  return {
    wallet: walletAddress,
    walletTokenBalance: balance.amount.toString(),
    position: eligibleAmount > 0n ? {
      amount: eligibleAmount.toString(),
      streakStartedAt,
      streakSeconds: streakSeconds.toString(),
      lockedUntil: null,
      bonusBps,
      tier,
      tierName: tierName(tier),
    } : null,
  };
}

async function openRound(config: DbConfig) {
  const db = requireDb();
  const current = bigintValue(config.current_round);
  const next = current + 1n;
  const openedAt = new Date();
  const closesAt = addSeconds(openedAt, Number(config.round_length_seconds));
  const claimDeadline = addSeconds(new Date(closesAt), Number(config.claim_window_seconds));
  const pot = bigintValue(config.available_pool_lamports);

  const round = {
    round_number: next.toString(),
    status: "open",
    opened_at: openedAt.toISOString(),
    closes_at: closesAt,
    claim_deadline: claimDeadline,
    pot_lamports: pot.toString(),
    remaining_lamports: pot.toString(),
    cooperate_weight: "0",
    defect_weight: "0",
    distribution_weight: "0",
    voter_count: 0,
    updated_at: nowIso(),
  };
  const { error: roundError } = await db.from("rounds").upsert(round);
  if (roundError) throw roundError;
  const { error: configError } = await db.from("protocol_config").update({
    current_round: next.toString(),
    available_pool_lamports: "0",
    round_active: true,
    next_round_at: closesAt,
    updated_at: nowIso(),
  }).eq("id", true);
  if (configError) throw configError;
  await db.from("protocol_events").insert({
    event_type: "ROUND_OPENED",
    round_number: next.toString(),
    detail: `Round ${next.toString()} opened for ${Math.floor(Number(config.round_length_seconds) / 60)} minutes.`,
  });
}

async function settleRound(config: DbConfig, round: DbRound) {
  const db = requireDb();
  const cooperate = bigintValue(round.cooperate_weight);
  const defect = bigintValue(round.defect_weight);
  const total = cooperate + defect;
  const pot = bigintValue(round.pot_lamports);
  const defectBps = total === 0n ? 10_000n : (defect * 10_000n) / total;
  const rollsOver = total === 0n || defectBps >= BigInt(config.defect_threshold_bps);
  const status = rollsOver ? "rolled_over" : "settled";
  const detail = rollsOver
    ? `Round ${round.round_number} rolled over. Too many holders defected.`
    : `Round ${round.round_number} settled. Majority cooperated. Rewards are claimable.`;

  const { error: roundError } = await db.from("rounds").update({
    status,
    remaining_lamports: pot.toString(),
    updated_at: nowIso(),
  }).eq("round_number", String(round.round_number));
  if (roundError) throw roundError;

  const availablePool = rollsOver ? bigintValue(config.available_pool_lamports) + pot : bigintValue(config.available_pool_lamports);
  const { error: configError } = await db.from("protocol_config").update({
    available_pool_lamports: availablePool.toString(),
    round_active: false,
    next_round_at: nowIso(),
    updated_at: nowIso(),
  }).eq("id", true);
  if (configError) throw configError;

  await db.from("protocol_events").insert({
    event_type: rollsOver ? "ROUND_ROLLED_OVER" : "ROUND_SETTLED",
    round_number: String(round.round_number),
    detail,
  });
}

async function keeperTick() {
  if (!supabase || !tokenMint || keeperBusy) return;
  keeperBusy = true;
  try {
    const config = await ensureGameConfig();
    if (config.paused) return;

    const now = Date.now();
    const nextAt = config.next_round_at ? new Date(config.next_round_at).getTime() : 0;
    const round = await fetchCurrentRound(config);

    if (config.round_active && round?.status === "open" && now >= nextAt) {
      await settleRound(config, round);
    }

    const freshConfig = await ensureGameConfig();
    const freshNextAt = freshConfig.next_round_at ? new Date(freshConfig.next_round_at).getTime() : 0;
    if (!freshConfig.round_active && now >= freshNextAt) {
      await openRound(freshConfig);
    }
  } catch (error) {
    console.error("keeper tick failed", error);
  } finally {
    keeperBusy = false;
  }
}

async function addCollectedFeesToPot(amount: bigint, signature: string) {
  const db = requireDb();
  const config = await ensureGameConfig();
  const nextPool = bigintValue(config.available_pool_lamports) + amount;
  const { error } = await db.from("protocol_config").update({
    available_pool_lamports: nextPool.toString(),
    updated_at: nowIso(),
  }).eq("id", true);
  if (error) throw error;
  await db.from("protocol_events").insert({
    event_type: "PUMP_FEES_COLLECTED",
    detail: `${amount.toString()} lamports collected from Pump creator fees and added to the next game pot.`,
    transaction_signature: signature,
  });
}

async function collectPumpCreatorFees() {
  if (!pumpCreator || feeCollectorBusy) return;
  feeCollectorBusy = true;
  try {
    const available = await pumpSdk.getCreatorVaultBalanceBothPrograms(pumpCreator.publicKey);
    const amount = BigInt(available.toString());
    if (amount <= 0n) return;

    const collectInstructions = await pumpSdk.collectCoinCreatorFeeInstructions(
      pumpCreator.publicKey,
      pumpCreator.publicKey,
    );
    const latest = await connection.getLatestBlockhash("confirmed");
    const transaction = new Transaction({
      feePayer: pumpCreator.publicKey,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    }).add(...collectInstructions);
    const signature = await connection.sendTransaction(transaction, [pumpCreator], {
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });
    await connection.confirmTransaction(signature, "confirmed");
    if (supabase && tokenMint) await addCollectedFeesToPot(amount, signature);
  } catch (error) {
    console.error("pump creator fee collection failed", error);
  } finally {
    feeCollectorBusy = false;
  }
}

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || origin === env.SITE_ORIGIN || origin.startsWith("http://localhost:")) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const healthResponse = () => ({
  ok: true,
  cluster: clusterName,
  tokenMint: tokenMint?.toBase58() ?? null,
  database: Boolean(supabase),
  keeper: Boolean(keeper),
  pumpCreator: Boolean(pumpCreator),
  payoutWallet: payoutWallet?.publicKey.toBase58() ?? null,
  feeCollectionIntervalMs: env.FEE_COLLECTION_INTERVAL_MS,
  roundLengthSeconds: env.ROUND_LENGTH_SECONDS,
  minHoldingTokens: env.MIN_HOLDING_TOKENS,
  warnings: keypairWarnings,
});

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "hodl-or-no-hodl-api", health: "/health", status: "/api/status" });
});

app.get("/health", (_req, res) => {
  res.json(healthResponse());
});

app.get("/api/health", (_req, res) => {
  res.json({
    ...healthResponse(),
    canonical: "/health",
  });
});

app.get("/api/status", async (_req, res, next) => {
  try {
    await keeperTick();
    if (!supabase || !tokenMint) {
      return res.json({ configured: false, cluster: clusterName, programId: "supabase-mainnet-game", tokenMint: tokenMint?.toBase58() ?? null });
    }
    const config = await ensureGameConfig();
    const round = await fetchCurrentRound(config);
    const [{ count }, { data: oldest }, decimals] = await Promise.all([
      supabase.from("holders").select("wallet", { count: "exact", head: true }).gt("position_amount", 0),
      supabase.from("holders").select("streak_started_at").gt("position_amount", 0).order("streak_started_at", { ascending: true }).limit(1).maybeSingle<{ streak_started_at: string | null }>(),
      tokenSupplyDecimals(),
    ]);
    const longestStreakDays = oldest?.streak_started_at
      ? Math.max(0, Math.floor((Date.now() - new Date(oldest.streak_started_at).getTime()) / 86_400_000))
      : 0;
    res.json({
      configured: true,
      cluster: clusterName,
      programId: "supabase-mainnet-game",
      tokenMint: tokenMint.toBase58(),
      tokenDecimals: decimals,
      currentRound: String(config.current_round),
      availablePoolLamports: String(config.available_pool_lamports),
      roundLengthSeconds: String(config.round_length_seconds),
      claimWindowSeconds: String(config.claim_window_seconds),
      defectThresholdBps: config.defect_threshold_bps,
      defectorBonusBps: config.defector_bonus_bps,
      nextRoundAt: iso(config.next_round_at),
      roundActive: config.round_active,
      paused: config.paused,
      activeHolders: count ?? 0,
      longestStreakDays,
      round: publicRound(round),
    });
  } catch (error) { next(error); }
});

app.get("/api/leaderboard", async (_req, res, next) => {
  try {
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from("holders").select("wallet,position_amount,streak_started_at,tier,cooperate_votes,defect_votes,bonus_bps").gt("position_amount", 0).order("streak_started_at", { ascending: true }).limit(50);
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) { next(error); }
});

app.get("/api/events", async (_req, res, next) => {
  try {
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from("protocol_events").select("*").order("occurred_at", { ascending: false }).limit(50);
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) { next(error); }
});

app.get("/api/auth/challenge", (req, res, next) => {
  try {
    const wallet = new PublicKey(z.string().parse(req.query.wallet)).toBase58();
    const nonce = randomUUID();
    const expiresAt = Date.now() + 5 * 60_000;
    nonces.set(wallet, { nonce, expiresAt });
  const message = `Hodl or No Hodl.fun\nSign in to play.\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}`;
    res.json({ message, expiresAt: new Date(expiresAt).toISOString() });
  } catch (error) { next(error); }
});

app.post("/api/auth/verify", async (req, res, next) => {
  try {
    if (!sessionKey) throw new Error("Wallet authentication is not configured.");
    const body = z.object({ wallet: z.string(), message: z.string(), signature: z.string() }).parse(req.body);
    const wallet = new PublicKey(body.wallet).toBase58();
    const pending = nonces.get(wallet);
    if (!pending || pending.expiresAt < Date.now() || !body.message.includes(`Nonce: ${pending.nonce}`)) throw new Error("The sign-in challenge expired.");
    const signature = body.signature.includes("=") ? Buffer.from(body.signature, "base64") : bs58.decode(body.signature);
    const valid = nacl.sign.detached.verify(new TextEncoder().encode(body.message), signature, new PublicKey(wallet).toBytes());
    if (!valid) throw new Error("The wallet signature is invalid.");
    nonces.delete(wallet);
    const token = await new SignJWT({ wallet }).setProtectedHeader({ alg: "HS256" }).setSubject(wallet).setIssuer("hodlornohodl.fun").setAudience("game").setIssuedAt().setExpirationTime("12h").sign(sessionKey);
    res.json({ token, wallet, expiresIn: 43_200 });
  } catch (error) { next(error); }
});

app.get("/api/holder/:wallet", async (req, res, next) => {
  try {
    const wallet = new PublicKey(req.params.wallet);
    if (!supabase || !tokenMint) {
      return res.json({
        wallet: wallet.toBase58(),
        walletTokenBalance: "0",
        position: null,
      });
    }
    await ensureGameConfig();
    res.json(await syncHolder(wallet));
  } catch (error) { next(error); }
});

const walletBody = z.object({ wallet: z.string() });

app.post("/api/tx/initialize", async (req, res, next) => {
  try {
    const { wallet: raw } = walletBody.parse(req.body);
    await requireSameWallet(req, raw);
    if (env.INITIAL_ADMIN && new PublicKey(raw).toBase58() !== new PublicKey(env.INITIAL_ADMIN).toBase58()) {
      throw new Error("Only the configured admin can initialize the game.");
    }
    await ensureGameConfig();
    res.json({ ok: true, message: "The Banker is preparing the first offer." });
  } catch (error) { next(error); }
});

app.post("/api/tx/open-position", async (req, res, next) => {
  try {
    const { wallet: raw } = walletBody.parse(req.body);
    await requireSameWallet(req, raw);
    const holder = await syncHolder(new PublicKey(raw));
    if (!holder.position) throw new Error(`This wallet must hold at least ${env.MIN_HOLDING_TOKENS} tokens.`);
    res.json({ ok: true, message: "Seat claimed. The Banker has your wallet on the board.", holder });
  } catch (error) { next(error); }
});

app.post("/api/tx/deposit", async (req, res, next) => {
  try {
    const { wallet: raw } = walletBody.parse(req.body);
    await requireSameWallet(req, raw);
    const holder = await syncHolder(new PublicKey(raw));
    if (!holder.position) throw new Error(`This wallet must hold at least ${env.MIN_HOLDING_TOKENS} tokens.`);
    res.json({ ok: true, message: "Seat refreshed. Keep the box closed.", holder });
  } catch (error) { next(error); }
});

app.post("/api/tx/withdraw", async (req, res, next) => {
  try {
    const { wallet: raw } = walletBody.parse(req.body);
    await requireSameWallet(req, raw);
    const holder = await syncHolder(new PublicKey(raw));
    res.json({ ok: true, message: "Seat refreshed from the board.", holder });
  } catch (error) { next(error); }
});

app.post("/api/tx/vote", async (req, res, next) => {
  try {
    const db = requireDb();
    const body = walletBody.extend({ choice: z.enum(["cooperate", "defect"]) }).parse(req.body);
    await requireSameWallet(req, body.wallet);
    const config = await ensureGameConfig();
    if (!config.round_active) throw new Error("No round is currently open.");
    const round = await fetchCurrentRound(config);
    if (!round || round.status !== "open") throw new Error("No round is currently open.");

    const holder = await syncHolder(new PublicKey(body.wallet));
    if (!holder.position) throw new Error(`This wallet must hold at least ${env.MIN_HOLDING_TOKENS} tokens to vote.`);

    const baseBalance = bigintValue(holder.position.amount);
    const holderMultiplier = multiplierBps(holder.position.streakStartedAt);
    const voteMultiplier = body.choice === "defect"
      ? Math.floor((holderMultiplier * config.defector_bonus_bps) / 10_000)
      : holderMultiplier;
    const weight = (baseBalance * BigInt(voteMultiplier)) / 10_000n;
    if (weight <= 0n) throw new Error("This wallet has no vote weight.");

    const vote = {
      round_number: String(round.round_number),
      wallet: new PublicKey(body.wallet).toBase58(),
      choice: body.choice,
      weight: weight.toString(),
      multiplier_bps: voteMultiplier,
      voted_at: nowIso(),
    };
    const { error: voteError } = await db.from("round_votes").insert(vote);
    if (voteError) throw voteError;

    const nextCooperate = bigintValue(round.cooperate_weight) + (body.choice === "cooperate" ? weight : 0n);
    const nextDefect = bigintValue(round.defect_weight) + (body.choice === "defect" ? weight : 0n);
    const { error: roundError } = await db.from("rounds").update({
      cooperate_weight: nextCooperate.toString(),
      defect_weight: nextDefect.toString(),
      distribution_weight: (nextCooperate + nextDefect).toString(),
      voter_count: (round.voter_count ?? 0) + 1,
      updated_at: nowIso(),
    }).eq("round_number", String(round.round_number));
    if (roundError) throw roundError;

    const voteColumn = body.choice === "cooperate" ? "cooperate_votes" : "defect_votes";
    const { data: holderStats } = await db
      .from("holders")
      .select("cooperate_votes,defect_votes")
      .eq("wallet", vote.wallet)
      .maybeSingle<{ cooperate_votes: number; defect_votes: number }>();
    const nextVoteCount = ((body.choice === "cooperate" ? holderStats?.cooperate_votes : holderStats?.defect_votes) ?? 0) + 1;
    const { error: holderError } = await db
      .from("holders")
      .update({ [voteColumn]: nextVoteCount, updated_at: nowIso() })
      .eq("wallet", vote.wallet);
    if (holderError) console.error("holder vote stat update failed", holderError);

    await db.from("protocol_events").insert({
      event_type: body.choice === "cooperate" ? "VOTE_COOPERATE" : "VOTE_DEFECT",
      round_number: String(round.round_number),
      wallet: vote.wallet,
      detail: `${vote.wallet.slice(0, 4)}...${vote.wallet.slice(-4)} chose ${body.choice}.`,
    });
    res.json({ ok: true, message: body.choice === "cooperate" ? "HODL locked in." : "NO HODL locked in.", weight: weight.toString() });
  } catch (error) { next(error); }
});

app.post("/api/tx/claim", async (req, res, next) => {
  try {
    const db = requireDb();
    if (!payoutWallet) throw new Error("Payout wallet is not configured.");
    const body = walletBody.extend({ roundNumber: z.string().regex(/^\d+$/) }).parse(req.body);
    await requireSameWallet(req, body.wallet);
    const wallet = new PublicKey(body.wallet);
    const { data: round, error: roundError } = await db.from("rounds").select("*").eq("round_number", body.roundNumber).single<DbRound>();
    if (roundError) throw roundError;
    if (round.status !== "settled") throw new Error("This round is not claimable.");
    const { data: vote, error: voteError } = await db
      .from("round_votes")
      .select("weight")
      .eq("round_number", body.roundNumber)
      .eq("wallet", wallet.toBase58())
      .maybeSingle<{ weight: number | string }>();
    if (voteError) throw voteError;
    if (!vote) throw new Error("This wallet did not vote in the round.");

    const amount = (bigintValue(round.pot_lamports) * bigintValue(vote.weight)) / bigintValue(round.distribution_weight);
    if (amount <= 0n) throw new Error("No reward is claimable for this wallet.");

    const claimRow = {
      round_number: body.roundNumber,
      wallet: wallet.toBase58(),
      amount_lamports: amount.toString(),
      claimed_at: nowIso(),
      transaction_signature: null as string | null,
    };
    const { error: claimInsertError } = await db.from("reward_claims").insert(claimRow);
    if (claimInsertError) throw new Error("Reward was already claimed or could not be reserved.");

    try {
      const latest = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({
        feePayer: payoutWallet.publicKey,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      }).add(SystemProgram.transfer({
        fromPubkey: payoutWallet.publicKey,
        toPubkey: wallet,
        lamports: Number(amount),
      }));
      const signature = await connection.sendTransaction(transaction, [payoutWallet], {
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });
      await connection.confirmTransaction(signature, "confirmed");
      const remaining = bigintValue(round.remaining_lamports) > amount ? bigintValue(round.remaining_lamports) - amount : 0n;
      await db.from("reward_claims").update({ transaction_signature: signature }).eq("round_number", body.roundNumber).eq("wallet", wallet.toBase58());
      await db.from("rounds").update({ remaining_lamports: remaining.toString(), updated_at: nowIso() }).eq("round_number", body.roundNumber);
      await db.from("protocol_events").insert({
        event_type: "REWARD_CLAIMED",
        round_number: body.roundNumber,
        wallet: wallet.toBase58(),
        detail: `${amount.toString()} lamports claimed from round ${body.roundNumber}.`,
        transaction_signature: signature,
      });
      res.json({ ok: true, message: "Offer paid.", signature, amountLamports: amount.toString() });
    } catch (sendError) {
      await db.from("reward_claims").delete().eq("round_number", body.roundNumber).eq("wallet", wallet.toBase58());
      throw sendError;
    }
  } catch (error) { next(error); }
});

app.post("/api/tx/fund", async (_req, res, next) => {
  try {
    throw new Error("Manual wallet funding is disabled in Supabase game mode. Pump creator fees fund the game pot every 15 minutes.");
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  console.error("api request failed", error);
  const status = /required|invalid|expired|match|initialized|open|configured|claimed|hold|vote/i.test(message) ? 400 : 500;
  res.status(status).json({ error: publicErrorMessage(message) });
});

const listenPorts = Array.from(new Set([env.PORT, 3001, 8080])).filter((port) => Number.isInteger(port) && port > 0);

listenPorts.forEach((port) => {
  app.listen(port, () => {
    console.log(`Hodl or No Hodl keeper/API listening on ${port}`);
  });
});

console.log(`Hodl or No Hodl primary API port ${env.PORT}`);
{
  console.log(`Mainnet game mode: rounds=${env.ROUND_LENGTH_SECONDS}s feeCollection=${env.FEE_COLLECTION_INTERVAL_MS}ms`);
  void keeperTick();
  void collectPumpCreatorFees();
  setInterval(() => void keeperTick(), 15_000).unref();
  setInterval(() => void collectPumpCreatorFees(), env.FEE_COLLECTION_INTERVAL_MS).unref();
}
