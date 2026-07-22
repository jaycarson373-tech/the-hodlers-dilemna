import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import express, { type NextFunction, type Request, type Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import { jwtVerify, SignJWT } from "jose";
import nacl from "tweetnacl";
import { z } from "zod";

import { parseKeypairValue } from "./keypairs.js";

type PumpSdkClient = {
  getCreatorVaultBalanceBothPrograms(creator: PublicKey): Promise<{ toString(): string }>;
  collectCoinCreatorFeeInstructions(creator: PublicKey, payer: PublicKey): Promise<TransactionInstruction[]>;
};

const nodeRequire = createRequire(import.meta.url);
const { OnlinePumpSdk } = nodeRequire("@pump-fun/pump-sdk") as {
  OnlinePumpSdk: new (connection: Connection) => PumpSdkClient;
};

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65_535).default(3001),
  SITE_ORIGIN: z.string().url().default("http://localhost:3000"),
  SOLANA_RPC_URL: z.string().url(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  KEEPER_PRIVATE_KEY: z.string().optional(),
  KEEPER_KEYPAIR_BASE64: z.string().optional(),
  PUMP_CREATOR_PRIVATE_KEY: z.string().optional(),
  PUMP_CREATOR_KEYPAIR_BASE64: z.string().optional(),
  FEE_COLLECTION_INTERVAL_MS: z.coerce.number().int().positive().default(900_000),
  ROUND_LENGTH_SECONDS: z.coerce.number().int().positive().default(900),
  DECISION_WINDOW_SECONDS: z.coerce.number().int().positive().default(300),
  COOPERATION_THRESHOLD_BPS: z.coerce.number().int().min(1).max(10_000).default(7_000),
  DEAL_BUDGET_BPS: z.coerce.number().int().min(1).max(10_000).default(3_000),
  SWEEP_ENABLED: z.string().optional().transform((value) => value === "true").default(false),
  PAYOUT_ENABLED: z.string().optional().transform((value) => value === "true").default(false),
  MIN_HOLDING_TOKENS: z.string().regex(/^\d+(\.\d+)?$/).default("1000000"),
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
  pot_rollover_count?: number;
  failed_round_count?: number;
  round_length_seconds: number | string;
  decision_window_seconds?: number | string;
  cooperation_threshold_bps?: number;
  claim_window_seconds?: number | string;
  defect_threshold_bps?: number;
  defector_bonus_bps?: number;
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
  deal_budget_lamports?: number | string;
  accepted_deals_lamports?: number | string;
  hodl_pool_lamports?: number | string;
  rollover_lamports?: number | string;
  weighted_hodl_bps?: number | null;
  force_open?: boolean;
  settled_at?: string | null;
};

type RoundSnapshot = {
  wallet: string;
  snapshot_balance: number | string;
  multiplier_bps: number;
  payout_weight: number | string;
  banker_offer_lamports: number | string;
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
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const addSeconds = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000).toISOString();
const bigintValue = (value: unknown) => BigInt(String(value ?? "0"));
const iso = (value?: string | null) => value ?? null;
const tierName = (tier: number) => ["Paper Hands", "Iron Hands", "Diamond Hands", "Obsidian Hands"][tier] ?? "Paper Hands";
const publicErrorMessage = (message: string) => {
  if (/supabase|token_mint|database|configured|configuration|column|relation|schema|railway|api|rpc|keypair|private|secret/i.test(message)) {
    return "The Banker's call could not be completed. Try again.";
  }
  return message;
};

const isMissingSchemaObject = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "42P01"
    || candidate.code === "42703"
    || candidate.code === "PGRST204"
    || candidate.code === "PGRST205"
    || /does not exist|not found in the schema cache/i.test(candidate.message ?? "");
};

const validStatelessChallenge = (message: string, wallet: string) => {
  const match = message.match(/^Hodl or No Hodl\.fun\nSign in to play\.\nWallet: ([1-9A-HJ-NP-Za-km-z]+)\nNonce: ([0-9a-f-]{36})\nExpires: ([^\n]+)$/i);
  if (!match || match[1] !== wallet) return false;
  const expiresAt = new Date(match[3]).getTime();
  return Number.isFinite(expiresAt) && expiresAt >= Date.now() && expiresAt <= Date.now() + 5 * 60_000;
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
  const db = requireDb();
  const { data: session, error } = await db
    .from("wallet_sessions")
    .select("wallet,expires_at,revoked_at")
    .eq("token_hash", sha256(token))
    .maybeSingle<{ wallet: string; expires_at: string; revoked_at: string | null }>();
  if (error && isMissingSchemaObject(error)) return payload.sub;
  if (error || !session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    throw new Error("Wallet session expired. Sign in again.");
  }
  if (new PublicKey(session.wallet).toBase58() !== new PublicKey(payload.sub).toBase58()) {
    throw new Error("Invalid wallet session.");
  }
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
  const accounts = await connection.getParsedTokenAccountsByOwner(wallet, { mint: tokenMint }, "confirmed");
  const amount = accounts.value.reduce((sum, account) => {
    const tokenAmount = account.account.data.parsed.info.tokenAmount as { amount: string };
    return sum + BigInt(tokenAmount.amount);
  }, 0n);
  return {
    amount,
    decimals: await tokenSupplyDecimals(),
  };
}

function minimumHoldingBaseUnits(decimals: number) {
  return tokenAmountStringToBaseUnits(env.MIN_HOLDING_TOKENS, decimals);
}

async function fetchMintHolders() {
  if (!tokenMint) return new Map<string, bigint>();
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    commitment: "confirmed",
    filters: [{ dataSize: 165 }, { memcmp: { offset: 0, bytes: tokenMint.toBase58() } }],
    dataSlice: { offset: 32, length: 40 },
  });
  const balances = new Map<string, bigint>();
  for (const { account } of accounts) {
    const data = Buffer.from(account.data);
    if (data.length < 40) continue;
    const owner = new PublicKey(data.subarray(0, 32)).toBase58();
    const amount = data.readBigUInt64LE(32);
    if (amount > 0n) balances.set(owner, (balances.get(owner) ?? 0n) + amount);
  }
  return balances;
}

async function writeAudit(input: {
  idempotencyKey: string;
  action: string;
  status: "planned" | "dry_run" | "broadcast" | "confirmed" | "failed";
  roundNumber?: string;
  wallet?: string;
  amountLamports?: bigint;
  payload?: Record<string, unknown>;
  signature?: string;
  errorMessage?: string;
}) {
  const db = requireDb();
  const { data: existing, error: existingError } = await db.from("audit_log").select("*").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;
  const row = {
    idempotency_key: input.idempotencyKey,
    action: input.action,
    status: input.status,
    round_number: input.roundNumber ?? null,
    wallet: input.wallet ?? null,
    amount_lamports: input.amountLamports?.toString() ?? null,
    payload: input.payload ?? {},
    transaction_signature: input.signature ?? null,
    error_message: input.errorMessage ?? null,
    updated_at: nowIso(),
  };
  const { data, error } = await db.from("audit_log").insert(row).select("*").single();
  if (error) throw error;
  return data;
}

async function sendDirectPayout(roundNumber: string, wallet: string, amount: bigint, kind: "banker_deal" | "hodl_payout") {
  if (amount <= 0n) return null;
  const db = requireDb();
  const idempotencyKey = `${roundNumber}:${wallet}`;
  await writeAudit({ idempotencyKey, action: kind, status: "dry_run", roundNumber, wallet, amountLamports: amount, payload: { directPayout: true } });
  if (!env.PAYOUT_ENABLED) return null;
  if (!payoutWallet) throw new Error("Payout wallet is not configured.");

  const { data: existing, error: existingError } = await db.from("audit_log").select("status,transaction_signature").eq("idempotency_key", idempotencyKey).maybeSingle<{ status: string; transaction_signature: string | null }>();
  if (existingError) throw existingError;
  if (existing?.status === "confirmed") return existing.transaction_signature;
  if (existing?.status === "failed") await db.from("audit_log").update({ status: "dry_run", error_message: null, updated_at: nowIso() }).eq("idempotency_key", idempotencyKey);
  if (!existing || !["dry_run", "failed"].includes(existing.status)) throw new Error(`Payout ${idempotencyKey} requires reconciliation before retry.`);

  await db.from("audit_log").update({ status: "broadcast", updated_at: nowIso() }).eq("idempotency_key", idempotencyKey);
  try {
    const latest = await connection.getLatestBlockhash("confirmed");
    const transaction = new Transaction({
      feePayer: payoutWallet.publicKey,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    }).add(SystemProgram.transfer({ fromPubkey: payoutWallet.publicKey, toPubkey: new PublicKey(wallet), lamports: amount }));
    const signature = await connection.sendTransaction(transaction, [payoutWallet], { preflightCommitment: "confirmed", maxRetries: 3 });
    await connection.confirmTransaction(signature, "confirmed");
    await db.from("audit_log").update({ status: "confirmed", transaction_signature: signature, updated_at: nowIso() }).eq("idempotency_key", idempotencyKey);
    await db.from("reward_claims").upsert({ round_number: roundNumber, wallet, amount_lamports: amount.toString(), claimed_at: nowIso(), transaction_signature: signature });
    return signature;
  } catch (error) {
    await db.from("audit_log").update({ status: "failed", error_message: error instanceof Error ? error.message : "Broadcast failed", updated_at: nowIso() }).eq("idempotency_key", idempotencyKey);
    throw error;
  }
}

function multiplierBps(streakStartedAt: string | null) {
  if (!streakStartedAt) return 10_000;
  const heldMs = Math.max(0, Date.now() - new Date(streakStartedAt).getTime());
  if (heldMs >= 7 * 86_400_000) return 40_000;
  if (heldMs >= 3 * 86_400_000) return 30_000;
  if (heldMs >= 86_400_000) return 25_000;
  if (heldMs >= 6 * 3_600_000) return 20_000;
  if (heldMs >= 2 * 3_600_000) return 15_000;
  if (heldMs >= 3_600_000) return 12_000;
  return 10_000;
}

function tierFor(streakStartedAt: string | null) {
  if (!streakStartedAt) return 0;
  const heldMs = Math.max(0, Date.now() - new Date(streakStartedAt).getTime());
  if (heldMs >= 7 * 86_400_000) return 3;
  if (heldMs >= 86_400_000) return 2;
  if (heldMs >= 2 * 3_600_000) return 1;
  return 0;
}

async function playerRoundSummary(wallet: string, liveBalance: bigint, streakStartedAt: string | null) {
  const db = requireDb();
  const config = await ensureGameConfig();
  const round = await fetchCurrentRound(config);
  if (!round) {
    return {
      snapshotBalance: liveBalance.toString(),
      multiplierBps: multiplierBps(streakStartedAt),
      playerWeight: ((liveBalance * BigInt(multiplierBps(streakStartedAt))) / 10_000n).toString(),
      bankerOfferLamports: "0",
      projectedShareLamports: "0",
      participationStatus: "between-rounds",
      soldThisRound: false,
    };
  }
  const roundNumber = String(round.round_number);

  const [{ data: snapshot, error: snapshotError }, { data: snapshots, error: snapshotsError }, { data: vote, error: voteError }] = await Promise.all([
    db.from("round_snapshots").select("snapshot_balance,multiplier_bps,payout_weight,banker_offer_lamports").eq("round_number", roundNumber).eq("wallet", wallet).maybeSingle<{ snapshot_balance: string; multiplier_bps: number; payout_weight: string; banker_offer_lamports: string }>(),
    db.from("round_snapshots").select("payout_weight").eq("round_number", roundNumber),
    db.from("sealed_choices").select("choice").eq("round_number", roundNumber).eq("wallet", wallet).is("superseded_at", null).maybeSingle<{ choice: "cooperate" | "defect" }>(),
  ]);
  if (snapshotError || snapshotsError || voteError) throw snapshotError ?? snapshotsError ?? voteError;

  const currentMultiplier = snapshot?.multiplier_bps ?? multiplierBps(streakStartedAt);
  const snapshotBalance = bigintValue(snapshot?.snapshot_balance ?? liveBalance);
  const payoutWeight = bigintValue(snapshot?.payout_weight ?? ((snapshotBalance * BigInt(currentMultiplier)) / 10_000n));
  const totalWeight = (snapshots ?? []).reduce((sum, item) => sum + bigintValue(item.payout_weight), 0n) || payoutWeight;
  const pot = bigintValue(round.pot_lamports) + bigintValue(config.available_pool_lamports);
  const projectedShare = totalWeight > 0n ? (((pot * 7n) / 10n) * payoutWeight) / totalWeight : 0n;

  return {
    snapshotBalance: snapshotBalance.toString(),
    multiplierBps: currentMultiplier,
    playerWeight: payoutWeight.toString(),
    bankerOfferLamports: String(snapshot?.banker_offer_lamports ?? "0"),
    projectedShareLamports: projectedShare.toString(),
    participationStatus: vote?.choice === "cooperate" ? "HODL" : vote?.choice === "defect" ? "NO HODL" : "SILENT / HODL",
    soldThisRound: Boolean(snapshot && liveBalance < snapshotBalance),
  };
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
    if (Number(data.round_length_seconds) !== env.ROUND_LENGTH_SECONDS) updates.round_length_seconds = env.ROUND_LENGTH_SECONDS.toString();
    if (Number(data.decision_window_seconds ?? 0) !== env.DECISION_WINDOW_SECONDS) updates.decision_window_seconds = env.DECISION_WINDOW_SECONDS.toString();
    if (Number(data.cooperation_threshold_bps ?? 0) !== env.COOPERATION_THRESHOLD_BPS) updates.cooperation_threshold_bps = env.COOPERATION_THRESHOLD_BPS;
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
    pot_rollover_count: 0,
    failed_round_count: 0,
    round_length_seconds: env.ROUND_LENGTH_SECONDS.toString(),
    decision_window_seconds: env.DECISION_WINDOW_SECONDS.toString(),
    cooperation_threshold_bps: env.COOPERATION_THRESHOLD_BPS,
    claim_window_seconds: "0",
    defect_threshold_bps: 3000,
    defector_bonus_bps: 10000,
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
  const choicesArePublic = round.status !== "open";
  const cooperatePercent = choicesArePublic ? (total === 0n ? 0 : Number((cooperate * 10_000n) / total) / 100) : null;
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
    defectPercent: cooperatePercent === null ? null : 100 - cooperatePercent,
    voterCount: choicesArePublic ? round.voter_count : 0,
    dealBudgetLamports: String(round.deal_budget_lamports ?? "0"),
    acceptedDealsLamports: String(round.accepted_deals_lamports ?? "0"),
    hodlPoolLamports: String(round.hodl_pool_lamports ?? "0"),
    rolloverLamports: String(round.rollover_lamports ?? "0"),
    weightedHodlBps: choicesArePublic ? round.weighted_hodl_bps ?? null : null,
    forceOpen: Boolean(round.force_open),
    settledAt: iso(round.settled_at),
    status: round.status,
  };
}

async function syncHolder(wallet: PublicKey) {
  const db = requireDb();
  const balance = await walletTokenBalance(wallet);
  const minimumHolding = minimumHoldingBaseUnits(balance.decimals);
  const eligibleAmount = balance.amount >= minimumHolding ? balance.amount : 0n;
  const walletAddress = wallet.toBase58();

  // A wallet below the entry threshold does not need a database row. Returning
  // its verified on-chain balance directly also keeps sign-in usable while the
  // holder has not yet bought enough tokens to claim a seat.
  if (eligibleAmount === 0n) {
    const { error: resetError } = await db
      .from("holders")
      .update({
        position_amount: "0",
        streak_started_at: null,
        updated_at: nowIso(),
      })
      .eq("wallet", walletAddress);
    if (resetError) console.error("ineligible holder reset failed", resetError);

    return {
      wallet: walletAddress,
      walletTokenBalance: balance.amount.toString(),
      position: null,
      ...await playerRoundSummary(walletAddress, balance.amount, null),
    };
  }

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
    ...await playerRoundSummary(walletAddress, balance.amount, streakStartedAt),
  };
}

async function openRound(config: DbConfig) {
  const db = requireDb();
  const current = bigintValue(config.current_round);
  const next = current + 1n;
  const openedAt = new Date();
  const closesAt = addSeconds(openedAt, Number(config.round_length_seconds));
  const pot = bigintValue(config.available_pool_lamports);
  const forceOpen = Number(config.failed_round_count ?? 0) >= 3;
  const onChainBalances = await fetchMintHolders();
  const decimals = await tokenSupplyDecimals();
  const minimum = minimumHoldingBaseUnits(decimals);
  const { data: holderRows, error: holderError } = await db.from("holders").select("wallet,streak_started_at");
  if (holderError) throw holderError;
  const holderByWallet = new Map((holderRows ?? []).map((holder) => [holder.wallet, holder]));
  const eligible = Array.from(onChainBalances.entries()).filter(([, balance]) => balance >= minimum);
  const weighted = eligible.map(([wallet, balance]) => {
    const streakStartedAt = holderByWallet.get(wallet)?.streak_started_at ?? openedAt.toISOString();
    const multiplier = multiplierBps(streakStartedAt);
    return { wallet, balance, streakStartedAt, multiplier, weight: (balance * BigInt(multiplier)) / 10_000n };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0n);
  const dealBudget = (pot * BigInt(env.DEAL_BUDGET_BPS)) / 10_000n;

  const round = {
    round_number: next.toString(),
    status: "open",
    opened_at: openedAt.toISOString(),
    closes_at: closesAt,
    claim_deadline: null,
    pot_lamports: pot.toString(),
    remaining_lamports: pot.toString(),
    cooperate_weight: "0",
    defect_weight: "0",
    distribution_weight: "0",
    voter_count: 0,
    deal_budget_lamports: dealBudget.toString(),
    accepted_deals_lamports: "0",
    hodl_pool_lamports: "0",
    rollover_lamports: "0",
    weighted_hodl_bps: null,
    force_open: forceOpen,
    settled_at: null,
    updated_at: nowIso(),
  };
  const { error: roundError } = await db.from("rounds").upsert(round);
  if (roundError) throw roundError;
  if (weighted.length) {
    const snapshotRows = weighted.map((item) => ({
      round_number: next.toString(),
      wallet: item.wallet,
      snapshot_balance: item.balance.toString(),
      multiplier_bps: item.multiplier,
      payout_weight: item.weight.toString(),
      banker_offer_lamports: totalWeight > 0n ? ((dealBudget * item.weight) / totalWeight).toString() : "0",
    }));
    const { error: snapshotError } = await db.from("round_snapshots").upsert(snapshotRows);
    if (snapshotError) throw snapshotError;
    const { error: holdersError } = await db.from("holders").upsert(weighted.map((item) => ({
      wallet: item.wallet,
      position_amount: item.balance.toString(),
      streak_started_at: item.streakStartedAt,
      bonus_bps: Math.max(0, item.multiplier - 10_000),
      tier: tierFor(item.streakStartedAt),
      updated_at: nowIso(),
    })));
    if (holdersError) throw holdersError;
  }
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
    detail: `Episode ${next.toString()} opened. The Box is live for ${Math.floor(Number(config.round_length_seconds) / 60)} minutes.`,
  });
}

async function settleRound(config: DbConfig, round: DbRound) {
  const db = requireDb();
  const roundNumber = String(round.round_number);
  const { data: workerState, error: workerError } = await db.from("worker_state").select("last_processed_round").eq("id", true).maybeSingle<{ last_processed_round: string }>();
  if (workerError) throw workerError;
  if (bigintValue(workerState?.last_processed_round) >= bigintValue(roundNumber)) return;

  const [{ data: snapshots, error: snapshotError }, { data: choices, error: choiceError }] = await Promise.all([
    db.from("round_snapshots").select("wallet,snapshot_balance,multiplier_bps,payout_weight,banker_offer_lamports").eq("round_number", roundNumber),
    db.from("sealed_choices").select("wallet,choice,salt,commitment").eq("round_number", roundNumber).is("superseded_at", null),
  ]);
  if (snapshotError || choiceError) throw snapshotError ?? choiceError;
  const currentBalances = await fetchMintHolders();
  const choiceByWallet = new Map((choices ?? []).map((choice) => [choice.wallet, choice]));
  const results = ((snapshots ?? []) as RoundSnapshot[]).map((snapshot) => {
    const snapshotBalance = bigintValue(snapshot.snapshot_balance);
    const liveBalance = currentBalances.get(snapshot.wallet) ?? 0n;
    const sold = liveBalance < snapshotBalance;
    const signed = choiceByWallet.get(snapshot.wallet);
    const choice: "cooperate" | "defect" = sold || signed?.choice === "defect" ? "defect" : "cooperate";
    return {
      ...snapshot,
      liveBalance,
      sold,
      choice,
      signed,
      weight: bigintValue(snapshot.payout_weight),
      offer: bigintValue(snapshot.banker_offer_lamports),
    };
  });
  const total = results.reduce((sum, item) => sum + item.weight, 0n);
  const cooperate = results.filter((item) => item.choice === "cooperate").reduce((sum, item) => sum + item.weight, 0n);
  const defect = total - cooperate;
  const pot = bigintValue(round.pot_lamports);
  const weightedHodlBps = total === 0n ? 0 : Number((cooperate * 10_000n) / total);
  const boxOpens = Boolean(round.force_open) || weightedHodlBps >= Number(config.cooperation_threshold_bps ?? env.COOPERATION_THRESHOLD_BPS);
  const acceptedDeals = results.filter((item) => item.choice === "defect");
  const acceptedDealsTotal = acceptedDeals.reduce((sum, item) => sum + item.offer, 0n);
  const dealBudget = (pot * BigInt(env.DEAL_BUDGET_BPS)) / 10_000n;
  if (acceptedDealsTotal > dealBudget) throw new Error("Posted Banker offers exceed the funded Deal Budget.");
  const remainingBox = pot - acceptedDealsTotal;
  const hodlWeight = cooperate;
  const payouts = results.map((item) => ({
    ...item,
    payout: item.choice === "defect"
      ? item.offer
      : boxOpens && hodlWeight > 0n
        ? (remainingBox * item.weight) / hodlWeight
        : 0n,
  }));
  const payoutPlan = payouts.filter((item) => item.payout > 0n).map((item) => ({ wallet: item.wallet, choice: item.choice, amountLamports: item.payout.toString() }));
  const totalPayouts = payouts.reduce((sum, item) => sum + item.payout, 0n);
  const unpaidBalance = pot - totalPayouts;

  if (choices?.length) {
    const { error: revealError } = await db.from("revealed_choices").upsert(choices.map((choice) => ({ round_number: roundNumber, wallet: choice.wallet, choice: choice.choice, salt: choice.salt, commitment: choice.commitment, revealed_at: nowIso() })));
    if (revealError) throw revealError;
    await db.from("sealed_choices").update({ revealed_at: nowIso() }).eq("round_number", roundNumber).is("superseded_at", null);
  }
  const { error: snapshotUpdateError } = await Promise.all(payouts.map((item) => db.from("round_snapshots").update({
    live_balance: item.liveBalance.toString(),
    forced_no_hodl: item.sold,
    final_choice: item.choice,
    payout_lamports: item.payout.toString(),
  }).eq("round_number", roundNumber).eq("wallet", item.wallet))).then((updates) => ({ error: updates.find((update) => update.error)?.error }));
  if (snapshotUpdateError) throw snapshotUpdateError;

  await writeAudit({
    idempotencyKey: `settlement:${roundNumber}:dry-run`,
    action: "settlement_plan",
    status: "dry_run",
    roundNumber,
    amountLamports: pot,
    payload: { weightedHodlBps, boxOpens, forceOpen: Boolean(round.force_open), dealBudgetLamports: dealBudget.toString(), acceptedDealsLamports: acceptedDealsTotal.toString(), remainingBoxLamports: remainingBox.toString(), payouts: payoutPlan },
  });
  if (!env.PAYOUT_ENABLED || !env.SWEEP_ENABLED) return;

  for (const payout of payouts) {
    if (payout.payout > 0n) await sendDirectPayout(roundNumber, payout.wallet, payout.payout, payout.choice === "defect" ? "banker_deal" : "hodl_payout");
  }

  for (const result of payouts) {
    const reset = result.choice === "defect";
    const holderUpdate: Record<string, unknown> = {
      position_amount: result.liveBalance.toString(),
      updated_at: nowIso(),
      ...(reset ? { streak_started_at: nowIso(), bonus_bps: 0, tier: 0, defect_votes: 1 } : { cooperate_votes: 1 }),
    };
    const { data: currentHolder } = await db.from("holders").select("wins,losses,total_airdropped_lamports,cooperate_votes,defect_votes").eq("wallet", result.wallet).maybeSingle<{ wins: number; losses: number; total_airdropped_lamports: string; cooperate_votes: number; defect_votes: number }>();
    holderUpdate.wins = (currentHolder?.wins ?? 0) + (boxOpens && result.choice === "cooperate" ? 1 : 0);
    holderUpdate.losses = (currentHolder?.losses ?? 0) + (!boxOpens && result.choice === "cooperate" ? 1 : 0);
    holderUpdate.total_airdropped_lamports = (bigintValue(currentHolder?.total_airdropped_lamports) + result.payout).toString();
    holderUpdate.cooperate_votes = (currentHolder?.cooperate_votes ?? 0) + (result.choice === "cooperate" ? 1 : 0);
    holderUpdate.defect_votes = (currentHolder?.defect_votes ?? 0) + (result.choice === "defect" ? 1 : 0);
    await db.from("holders").update(holderUpdate).eq("wallet", result.wallet);
  }

  const rollsOver = !boxOpens;
  const rollover = rollsOver ? remainingBox : 0n;
  const status = rollsOver ? "rolled_over" : "settled";
  const detail = rollsOver
    ? `The Box stayed closed. ${remainingBox.toString()} lamports roll into the next episode after Banker deals.`
    : `The Box opened. Banker deals were paid first and HODL players split the remainder.`;

  const { error: roundError } = await db.from("rounds").update({
    status,
    cooperate_weight: cooperate.toString(),
    defect_weight: defect.toString(),
    distribution_weight: hodlWeight.toString(),
    voter_count: results.length,
    accepted_deals_lamports: acceptedDealsTotal.toString(),
    hodl_pool_lamports: boxOpens ? remainingBox.toString() : "0",
    rollover_lamports: rollover.toString(),
    weighted_hodl_bps: weightedHodlBps,
    remaining_lamports: "0",
    settled_at: nowIso(),
    updated_at: nowIso(),
  }).eq("round_number", roundNumber);
  if (roundError) throw roundError;

  const availablePool = bigintValue(config.available_pool_lamports) + unpaidBalance;
  const { error: configError } = await db.from("protocol_config").update({
    available_pool_lamports: availablePool.toString(),
    pot_rollover_count: rollsOver ? Number(config.pot_rollover_count ?? 0) + 1 : 0,
    failed_round_count: rollsOver ? Number(config.failed_round_count ?? 0) + 1 : 0,
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
  if (acceptedDeals.length) {
    const biggest = acceptedDeals.reduce((largest, item) => item.offer > largest.offer ? item : largest, acceptedDeals[0]);
    await db.from("protocol_events").insert({
      event_type: "BANKER_DEALS_PAID",
      round_number: roundNumber,
      wallet: biggest.wallet,
      detail: `${acceptedDeals.length} Banker deal${acceptedDeals.length === 1 ? "" : "s"} paid. Biggest deal: ${biggest.offer.toString()} lamports.`,
    });
  }
  await db.from("worker_state").upsert({ id: true, last_processed_round: roundNumber, updated_at: nowIso() });
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

    if (config.round_active && round?.status === "open") {
      const decisionAt = new Date(round.closes_at).getTime() - Number(config.decision_window_seconds ?? env.DECISION_WINDOW_SECONDS) * 1_000;
      if (now >= decisionAt && now < new Date(round.closes_at).getTime()) {
        const db = requireDb();
        const { count } = await db.from("protocol_events").select("id", { count: "exact", head: true }).eq("event_type", "DECISION_WINDOW_OPENED").eq("round_number", String(round.round_number));
        if (!count) await db.from("protocol_events").insert({ event_type: "DECISION_WINDOW_OPENED", round_number: String(round.round_number), detail: "The Banker has called. Sealed choices are open." });
      }
    }

    const freshConfig = await ensureGameConfig();
    const freshNextAt = freshConfig.next_round_at ? new Date(freshConfig.next_round_at).getTime() : 0;
    if (!freshConfig.round_active && now >= freshNextAt && bigintValue(freshConfig.available_pool_lamports) > 0n) {
      await openRound(freshConfig);
    }
  } catch (error) {
    console.error("keeper tick failed", error);
  } finally {
    keeperBusy = false;
  }
}

async function addCollectedFeesToPot(idempotencyKey: string) {
  const db = requireDb();
  const { error } = await db.rpc("apply_confirmed_sweep", { p_idempotency_key: idempotencyKey });
  if (error) throw error;
}

async function collectPumpCreatorFees() {
  if (!pumpCreator || !supabase || !tokenMint || feeCollectorBusy) return;
  feeCollectorBusy = true;
  let chainConfirmed = false;
  let idempotencyKey = "";
  try {
    const db = requireDb();
    const sweepWindow = Math.floor(Date.now() / env.FEE_COLLECTION_INTERVAL_MS);
    idempotencyKey = `sweep:${sweepWindow}`;
    const { data: previous, error: previousError } = await db.from("audit_log").select("status,transaction_signature").eq("idempotency_key", idempotencyKey).maybeSingle<{ status: string; transaction_signature: string | null }>();
    if (previousError) throw previousError;
    if (previous?.status === "confirmed") {
      await addCollectedFeesToPot(idempotencyKey);
      return;
    }
    if (previous?.status === "broadcast") throw new Error(`Sweep ${idempotencyKey} requires transaction reconciliation.`);
    const available = await pumpSdk.getCreatorVaultBalanceBothPrograms(pumpCreator.publicKey);
    const amount = BigInt(available.toString());
    if (amount <= 0n) return;
    await writeAudit({ idempotencyKey, action: "creator_fee_sweep", status: "dry_run", amountLamports: amount, payload: { creator: pumpCreator.publicKey.toBase58(), window: sweepWindow } });
    if (!env.SWEEP_ENABLED) return;
    const { data: existing, error: auditError } = await db.from("audit_log").select("status,transaction_signature").eq("idempotency_key", idempotencyKey).single<{ status: string; transaction_signature: string | null }>();
    if (auditError) throw auditError;
    if (existing.status === "confirmed") return;
    await db.from("audit_log").update({ status: "broadcast", updated_at: nowIso() }).eq("idempotency_key", idempotencyKey);

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
    chainConfirmed = true;
    await db.from("audit_log").update({ status: "confirmed", transaction_signature: signature, updated_at: nowIso() }).eq("idempotency_key", idempotencyKey);
    await addCollectedFeesToPot(idempotencyKey);
  } catch (error) {
    if (!chainConfirmed && idempotencyKey && supabase) await supabase.from("audit_log").update({ status: "failed", error_message: error instanceof Error ? error.message : "Sweep failed", updated_at: nowIso() }).eq("idempotency_key", idempotencyKey);
    console.error("pump creator fee collection failed", error);
  } finally {
    feeCollectorBusy = false;
  }
}

const app = express();
app.use(express.json({ limit: "64kb" }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = new Set([
    env.SITE_ORIGIN,
    "https://hodlornohodl.fun",
    "https://www.hodlornohodl.fun",
  ]);
  if (!origin || allowedOrigins.has(origin) || origin.startsWith("http://localhost:")) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const readinessChecks = () => ({
  database: Boolean(supabase),
  tokenMint: Boolean(tokenMint),
  sessionSecret: Boolean(sessionKey),
  payoutWallet: Boolean(payoutWallet),
  pumpCreator: Boolean(pumpCreator),
  keypairsValid: keypairWarnings.length === 0,
});

const readinessResponse = async () => {
  const checks = readinessChecks();
  let databaseReachable = false;
  let databaseSchema = false;
  let schedulerCurrent = false;
  let tableChecks: Record<string, boolean> = {};
  let tokenMintReachable = false;

  if (supabase) {
    const { data, error: configError } = await supabase
      .from("protocol_config")
      .select("id,current_round,next_round_at,round_active,paused,available_pool_lamports")
      .eq("id", true)
      .maybeSingle<{
        id: boolean;
        current_round: number | string;
        next_round_at: string | null;
        round_active: boolean;
        paused: boolean;
        available_pool_lamports: number | string;
      }>();
    databaseReachable = !configError;
    const requiredTables = [
      "protocol_config",
      "rounds",
      "holders",
      "round_votes",
      "reward_claims",
      "protocol_events",
      "feed_events",
      "wallet_auth_nonces",
      "wallet_sessions",
      "round_snapshots",
      "sealed_choices",
      "commitments",
      "revealed_choices",
      "audience_signals",
      "audit_log",
      "worker_state",
    ];
    const tableResults = await Promise.all(requiredTables.map(async (table) => {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
      return [table, !error] as const;
    }));
    tableChecks = Object.fromEntries(tableResults);
    databaseSchema = Object.values(tableChecks).every(Boolean);
    const nextRoundAt = data?.next_round_at ? new Date(data.next_round_at).getTime() : 0;
    const hasFundedPot = bigintValue(data?.available_pool_lamports) > 0n;
    schedulerCurrent = Boolean(
      data
      && !data.paused
      && (data.round_active || !hasFundedPot || nextRoundAt >= Date.now() - 60_000),
    );
  }

  if (tokenMint) {
    tokenMintReachable = await connection
      .getTokenSupply(tokenMint, "confirmed")
      .then(() => true)
      .catch(() => false);
  }

  const deepChecks = { ...checks, databaseReachable, databaseSchema, schedulerCurrent, tokenMintReachable };
  const ok = Object.values(deepChecks).every(Boolean);
  return {
    ok,
    service: "hodl-or-no-hodl-api",
    cluster: clusterName,
    tokenMint: tokenMint?.toBase58() ?? null,
    checks: deepChecks,
    tableChecks,
    payoutWallet: payoutWallet?.publicKey.toBase58() ?? null,
    feeCollectionIntervalMs: env.FEE_COLLECTION_INTERVAL_MS,
    roundLengthSeconds: env.ROUND_LENGTH_SECONDS,
    minHoldingTokens: env.MIN_HOLDING_TOKENS,
    sweepEnabled: env.SWEEP_ENABLED,
    payoutEnabled: env.PAYOUT_ENABLED,
    cooperationThresholdBps: env.COOPERATION_THRESHOLD_BPS,
    dealBudgetBps: env.DEAL_BUDGET_BPS,
    decisionWindowSeconds: env.DECISION_WINDOW_SECONDS,
    warnings: keypairWarnings,
  };
};

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "hodl-or-no-hodl-api", live: "/health/live", ready: "/health/ready", status: "/api/status" });
});

app.get("/health", async (_req, res) => {
  const health = await readinessResponse();
  res.status(health.ok ? 200 : 503).json(health);
});

app.get("/health/live", (_req, res) => {
  res.json({ ok: true, service: "hodl-or-no-hodl-api" });
});

app.get("/health/ready", async (_req, res) => {
  const health = await readinessResponse();
  res.status(health.ok ? 200 : 503).json(health);
});

app.get("/api/health", async (_req, res) => {
  const health = await readinessResponse();
  res.status(health.ok ? 200 : 503).json({ ...health, canonical: "/health/ready" });
});

app.get("/api/status", async (_req, res, next) => {
  try {
    await keeperTick();
    if (!supabase || !tokenMint) {
      return res.json({ configured: false, cluster: clusterName, programId: "supabase-mainnet-game", tokenMint: tokenMint?.toBase58() ?? null });
    }
    const config = await ensureGameConfig();
    const round = await fetchCurrentRound(config);
    const [holderCountResult, oldestResult, decimals] = await Promise.all([
      supabase.from("holders").select("wallet", { count: "exact", head: true }).gt("position_amount", 0),
      supabase.from("holders").select("streak_started_at").gt("position_amount", 0).order("streak_started_at", { ascending: true }).limit(1).maybeSingle<{ streak_started_at: string | null }>(),
      tokenSupplyDecimals(),
    ]);
    if (holderCountResult.error) throw holderCountResult.error;
    if (oldestResult.error) throw oldestResult.error;
    const count = holderCountResult.count;
    const oldest = oldestResult.data;
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
      potRolloverCount: config.pot_rollover_count ?? 0,
      failedRoundCount: config.failed_round_count ?? 0,
      roundLengthSeconds: String(config.round_length_seconds),
      decisionWindowSeconds: String(config.decision_window_seconds ?? env.DECISION_WINDOW_SECONDS),
      cooperationThresholdBps: config.cooperation_threshold_bps ?? env.COOPERATION_THRESHOLD_BPS,
      dealBudgetBps: env.DEAL_BUDGET_BPS,
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

app.get("/api/rounds/:roundNumber/commitments", async (req, res, next) => {
  try {
    const db = requireDb();
    const roundNumber = z.string().regex(/^\d+$/).parse(req.params.roundNumber);
    const { data, error } = await db.from("commitments").select("round_number,wallet,commitment,version,superseded,created_at").eq("round_number", roundNumber).order("created_at", { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) { next(error); }
});

app.get("/api/rounds/:roundNumber/reveals", async (req, res, next) => {
  try {
    const db = requireDb();
    const roundNumber = z.string().regex(/^\d+$/).parse(req.params.roundNumber);
    const { data: round, error: roundError } = await db.from("rounds").select("status").eq("round_number", roundNumber).single<{ status: string }>();
    if (roundError) throw roundError;
    if (round.status === "open") return res.status(423).json({ error: "Choices remain sealed until the reveal." });
    const { data, error } = await db.from("revealed_choices").select("round_number,wallet,choice,salt,commitment,revealed_at").eq("round_number", roundNumber).order("wallet", { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) { next(error); }
});

app.get("/api/audience-signal/:roundNumber", async (req, res, next) => {
  try {
    const db = requireDb();
    const roundNumber = z.string().regex(/^\d+$/).parse(req.params.roundNumber);
    const { data, error } = await db.from("audience_signals").select("choice").eq("round_number", roundNumber);
    if (error) throw error;
    const total = data?.length ?? 0;
    const cooperate = data?.filter((row) => row.choice === "cooperate").length ?? 0;
    const raw = total ? (cooperate / total) * 100 : 50;
    const jitterSeed = Number.parseInt(sha256(`${env.SESSION_SECRET ?? "signal"}:${roundNumber}`).slice(0, 8), 16);
    const jitter = ((jitterSeed % 1001) - 500) / 100;
    const hodl = Math.min(95, Math.max(5, Math.round(raw + jitter)));
    res.json({ hodl, noHodl: 100 - hodl, sampleSize: total, label: "AUDIENCE SIGNAL — ESTIMATED SENTIMENT — NOT FINAL VOTES" });
  } catch (error) { next(error); }
});

app.post("/api/audience-signal", async (req, res, next) => {
  try {
    const db = requireDb();
    const body = z.object({ roundNumber: z.string().regex(/^\d+$/), choice: z.enum(["cooperate", "defect"]), signalId: z.string().uuid() }).parse(req.body);
    const { error } = await db.from("audience_signals").upsert({
      round_number: body.roundNumber,
      fingerprint_hash: sha256(`${env.SESSION_SECRET ?? "signal"}:${body.signalId}`),
      choice: body.choice,
      updated_at: nowIso(),
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get("/api/auth/challenge", async (req, res, next) => {
  try {
    const db = requireDb();
    const wallet = new PublicKey(z.string().parse(req.query.wallet)).toBase58();
    const nonce = randomUUID();
    const expiresAt = Date.now() + 5 * 60_000;
    nonces.set(wallet, { nonce, expiresAt });
    const message = `Hodl or No Hodl.fun\nSign in to play.\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}`;
    const { error } = await db.from("wallet_auth_nonces").upsert({
      wallet,
      message,
      nonce_hash: sha256(nonce),
      expires_at: new Date(expiresAt).toISOString(),
      consumed_at: null,
      created_at: nowIso(),
    });
    if (error && !isMissingSchemaObject(error)) throw error;
    res.json({ message, expiresAt: new Date(expiresAt).toISOString() });
  } catch (error) { next(error); }
});

app.post("/api/auth/verify", async (req, res, next) => {
  try {
    if (!sessionKey) throw new Error("Wallet authentication is not configured.");
    const db = requireDb();
    const body = z.object({ wallet: z.string(), message: z.string(), signature: z.string() }).parse(req.body);
    const wallet = new PublicKey(body.wallet).toBase58();
    const pending = nonces.get(wallet);
    const { data: stored, error: nonceError } = await db
      .from("wallet_auth_nonces")
      .select("message,expires_at,consumed_at")
      .eq("wallet", wallet)
      .maybeSingle<{ message: string; expires_at: string; consumed_at: string | null }>();
    if (nonceError && !isMissingSchemaObject(nonceError)) throw nonceError;
    const memoryValid = pending && pending.expiresAt >= Date.now() && body.message.includes(`Nonce: ${pending.nonce}`);
    const storedValid = stored && !stored.consumed_at && new Date(stored.expires_at).getTime() >= Date.now() && stored.message === body.message;
    const statelessValid = isMissingSchemaObject(nonceError) && validStatelessChallenge(body.message, wallet);
    if (!memoryValid && !storedValid && !statelessValid) throw new Error("The sign-in challenge expired.");
    const signature = body.signature.includes("=") ? Buffer.from(body.signature, "base64") : bs58.decode(body.signature);
    const valid = nacl.sign.detached.verify(new TextEncoder().encode(body.message), signature, new PublicKey(wallet).toBytes());
    if (!valid) throw new Error("The wallet signature is invalid.");
    nonces.delete(wallet);
    const { error: consumeError } = await db.from("wallet_auth_nonces").update({ consumed_at: nowIso() }).eq("wallet", wallet);
    if (consumeError && !isMissingSchemaObject(consumeError)) throw consumeError;
    const expiresAt = addSeconds(new Date(), 43_200);
    const token = await new SignJWT({ wallet }).setProtectedHeader({ alg: "HS256" }).setSubject(wallet).setIssuer("hodlornohodl.fun").setAudience("game").setIssuedAt().setExpirationTime("12h").sign(sessionKey);
    const { error: sessionError } = await db.from("wallet_sessions").insert({ wallet, token_hash: sha256(token), expires_at: expiresAt });
    if (sessionError && !isMissingSchemaObject(sessionError)) throw sessionError;
    res.json({ token, wallet, expiresIn: 43_200 });
  } catch (error) { next(error); }
});

app.get("/api/auth/session", async (req, res, next) => {
  try {
    const wallet = await authenticate(req);
    res.json({ ok: true, wallet });
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
    await requireSameWallet(req, wallet.toBase58());
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

app.post("/api/vote/commit", async (req, res, next) => {
  try {
    const db = requireDb();
    const body = walletBody.extend({
      roundNumber: z.string().regex(/^\d+$/),
      choice: z.enum(["cooperate", "defect"]),
      salt: z.string().regex(/^[a-f0-9]{64}$/i),
      commitment: z.string().regex(/^[a-f0-9]{64}$/i),
    }).parse(req.body);
    await requireSameWallet(req, body.wallet);
    const config = await ensureGameConfig();
    if (!config.round_active) throw new Error("No round is currently open.");
    const round = await fetchCurrentRound(config);
    if (!round || round.status !== "open") throw new Error("No round is currently open.");
    if (String(round.round_number) !== body.roundNumber) throw new Error("This decision belongs to a different round.");
    const now = Date.now();
    const closesAt = new Date(round.closes_at).getTime();
    if (now < closesAt - env.DECISION_WINDOW_SECONDS * 1_000 || now >= closesAt) throw new Error("Choices unlock when the Banker calls.");

    const holder = await syncHolder(new PublicKey(body.wallet));
    if (!holder.position) throw new Error(`This wallet must hold at least ${env.MIN_HOLDING_TOKENS} tokens to vote.`);
    const wallet = new PublicKey(body.wallet).toBase58();
    const commitment = body.commitment.toLowerCase();
    const expected = sha256(`${body.choice}${body.salt.toLowerCase()}${wallet}${body.roundNumber}`);
    if (expected !== commitment) throw new Error("The sealed decision hash is invalid.");

    const { data: current, error: currentError } = await db.from("sealed_choices").select("id,commitment,version").eq("round_number", body.roundNumber).eq("wallet", wallet).is("superseded_at", null).order("version", { ascending: false }).limit(1).maybeSingle<{ id: string; commitment: string; version: number }>();
    if (currentError) throw currentError;
    if (current?.commitment === commitment) return res.json({ ok: true, message: "DECISION SEALED", commitment, version: current.version });
    if (current) {
      const supersededAt = nowIso();
      const [{ error: sealedUpdateError }, { error: publicUpdateError }] = await Promise.all([
        db.from("sealed_choices").update({ superseded_at: supersededAt }).eq("id", current.id),
        db.from("commitments").update({ superseded: true }).eq("commitment", current.commitment),
      ]);
      if (sealedUpdateError || publicUpdateError) throw sealedUpdateError ?? publicUpdateError;
    }

    const version = (current?.version ?? 0) + 1;
    const [{ error: sealedError }, { error: commitmentError }] = await Promise.all([
      db.from("sealed_choices").insert({ round_number: body.roundNumber, wallet, choice: body.choice, salt: body.salt.toLowerCase(), commitment, version }),
      db.from("commitments").insert({ round_number: body.roundNumber, wallet, commitment, version }),
    ]);
    if (sealedError || commitmentError) throw sealedError ?? commitmentError;
    await db.from("protocol_events").insert({ event_type: "DECISION_SEALED", round_number: body.roundNumber, wallet, detail: `${wallet.slice(0, 4)}...${wallet.slice(-4)} sealed a decision.` });
    res.json({ ok: true, message: "DECISION SEALED", commitment, version });
  } catch (error) { next(error); }
});

app.post("/api/tx/vote", (_req, res) => {
  res.status(410).json({ error: "Use the sealed decision flow." });
});

app.post("/api/tx/claim", (_req, res) => {
  res.status(410).json({ error: "Payouts are sent directly. No claim is required." });
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

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Hodl or No Hodl keeper/API listening on ${env.PORT}`);
  console.log(`Mainnet game mode: rounds=${env.ROUND_LENGTH_SECONDS}s feeCollection=${env.FEE_COLLECTION_INTERVAL_MS}ms`);
  void (async () => {
    await collectPumpCreatorFees();
    await keeperTick();
  })();
  setInterval(() => void keeperTick(), 15_000).unref();
  setInterval(() => void collectPumpCreatorFees(), env.FEE_COLLECTION_INTERVAL_MS).unref();
});
