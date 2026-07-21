import { createHash, randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type AccountInfo,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import { jwtVerify, SignJWT } from "jose";
import nacl from "tweetnacl";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SITE_ORIGIN: z.string().url().default("http://localhost:3000"),
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
  PROTOCOL_PROGRAM_ID: z.string().default("GT42vQcCtut8XU4z7rm9MAoGrV462xB7qK16CDgMgWha"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  KEEPER_KEYPAIR_BASE64: z.string().optional(),
  TOKEN_MINT: z.string().optional(),
  INITIAL_ADMIN: z.string().optional(),
});

const env = envSchema.parse(process.env);
const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
const programId = new PublicKey(env.PROTOCOL_PROGRAM_ID);
const bpfLoaderUpgradeableProgramId = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const clusterName = env.SOLANA_RPC_URL.includes("devnet") ? "devnet" : "mainnet-beta";
const sessionKey = env.SESSION_SECRET ? new TextEncoder().encode(env.SESSION_SECRET) : undefined;
const supabase: SupabaseClient | undefined = env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : undefined;

const keeper = (() => {
  if (!env.KEEPER_KEYPAIR_BASE64) return undefined;
  const decoded = Buffer.from(env.KEEPER_KEYPAIR_BASE64, "base64");
  const secret = decoded[0] === 91
    ? Uint8Array.from(JSON.parse(decoded.toString("utf8")) as number[])
    : Uint8Array.from(decoded);
  return Keypair.fromSecretKey(secret);
})();

const CONFIG_SEED = Buffer.from("config");
const SOL_VAULT_SEED = Buffer.from("sol-vault");
const POSITION_SEED = Buffer.from("position");
const ESCROW_SEED = Buffer.from("escrow");
const ROUND_SEED = Buffer.from("round");
const VOTE_SEED = Buffer.from("vote");
const CLAIM_SEED = Buffer.from("claim");
const configPda = PublicKey.findProgramAddressSync([CONFIG_SEED], programId)[0];
const vaultPda = PublicKey.findProgramAddressSync([SOL_VAULT_SEED], programId)[0];
const programDataPda = PublicKey.findProgramAddressSync([programId.toBuffer()], bpfLoaderUpgradeableProgramId)[0];

type ProtocolConfig = {
  admin: PublicKey;
  tokenMint: PublicKey;
  tokenProgram: PublicKey;
  currentRound: bigint;
  availablePool: bigint;
  roundLengthSeconds: bigint;
  claimWindowSeconds: bigint;
  defectThresholdBps: number;
  defectorBonusBps: number;
  nextRoundAt: bigint;
  roundActive: boolean;
  paused: boolean;
  configBump: number;
  vaultBump: number;
};

type Round = {
  roundNumber: bigint;
  openedAt: bigint;
  closesAt: bigint;
  claimDeadline: bigint;
  potLamports: bigint;
  remainingLamports: bigint;
  cooperateWeight: bigint;
  defectWeight: bigint;
  distributionWeight: bigint;
  voterCount: number;
  status: number;
  bump: number;
};

type Position = {
  owner: PublicKey;
  amount: bigint;
  streakStartedAt: bigint;
  lastWithdrawAt: bigint;
  lockedUntil: bigint;
  bonusBps: number;
  tier: number;
  bump: number;
};

const discriminator = (namespace: "global" | "account", name: string) =>
  createHash("sha256").update(`${namespace}:${name}`).digest().subarray(0, 8);

const ensureDiscriminator = (data: Buffer, name: string) => {
  if (!data.subarray(0, 8).equals(discriminator("account", name))) {
    throw new Error(`Unexpected ${name} account discriminator.`);
  }
};

const readU16 = (data: Buffer, offset: number) => data.readUInt16LE(offset);
const readU32 = (data: Buffer, offset: number) => data.readUInt32LE(offset);
const readU64 = (data: Buffer, offset: number) => data.readBigUInt64LE(offset);
const readI64 = (data: Buffer, offset: number) => data.readBigInt64LE(offset);
const readKey = (data: Buffer, offset: number) => new PublicKey(data.subarray(offset, offset + 32));

function decodeConfig(info: AccountInfo<Buffer>): ProtocolConfig {
  const data = info.data;
  ensureDiscriminator(data, "ProtocolConfig");
  let o = 8;
  const admin = readKey(data, o); o += 32;
  const tokenMint = readKey(data, o); o += 32;
  const tokenProgram = readKey(data, o); o += 32;
  const currentRound = readU64(data, o); o += 8;
  const availablePool = readU64(data, o); o += 8;
  const roundLengthSeconds = readU64(data, o); o += 8;
  const claimWindowSeconds = readU64(data, o); o += 8;
  const defectThresholdBps = readU16(data, o); o += 2;
  const defectorBonusBps = readU16(data, o); o += 2;
  const nextRoundAt = readI64(data, o); o += 8;
  const roundActive = data[o++] === 1;
  const paused = data[o++] === 1;
  const configBump = data[o++];
  const vaultBump = data[o];
  return { admin, tokenMint, tokenProgram, currentRound, availablePool, roundLengthSeconds, claimWindowSeconds, defectThresholdBps, defectorBonusBps, nextRoundAt, roundActive, paused, configBump, vaultBump };
}

function decodeRound(info: AccountInfo<Buffer>): Round {
  const data = info.data;
  ensureDiscriminator(data, "DilemmaRound");
  let o = 8;
  const roundNumber = readU64(data, o); o += 8;
  const openedAt = readI64(data, o); o += 8;
  const closesAt = readI64(data, o); o += 8;
  const claimDeadline = readI64(data, o); o += 8;
  const potLamports = readU64(data, o); o += 8;
  const remainingLamports = readU64(data, o); o += 8;
  const cooperateWeight = readU64(data, o); o += 8;
  const defectWeight = readU64(data, o); o += 8;
  const distributionWeight = readU64(data, o); o += 8;
  const voterCount = readU32(data, o); o += 4;
  const status = data[o++];
  const bump = data[o];
  return { roundNumber, openedAt, closesAt, claimDeadline, potLamports, remainingLamports, cooperateWeight, defectWeight, distributionWeight, voterCount, status, bump };
}

function decodePosition(info: AccountInfo<Buffer>): Position {
  const data = info.data;
  ensureDiscriminator(data, "HolderPosition");
  let o = 8;
  const owner = readKey(data, o); o += 32;
  const amount = readU64(data, o); o += 8;
  const streakStartedAt = readI64(data, o); o += 8;
  const lastWithdrawAt = readI64(data, o); o += 8;
  const lockedUntil = readI64(data, o); o += 8;
  const bonusBps = readU16(data, o); o += 2;
  const tier = data[o++];
  const bump = data[o];
  return { owner, amount, streakStartedAt, lastWithdrawAt, lockedUntil, bonusBps, tier, bump };
}

const roundPda = (round: bigint) => {
  const n = Buffer.alloc(8); n.writeBigUInt64LE(round);
  return PublicKey.findProgramAddressSync([ROUND_SEED, n], programId)[0];
};
const positionPda = (wallet: PublicKey) => PublicKey.findProgramAddressSync([POSITION_SEED, wallet.toBuffer()], programId)[0];
const escrowPda = (wallet: PublicKey) => PublicKey.findProgramAddressSync([ESCROW_SEED, wallet.toBuffer()], programId)[0];
const votePda = (round: bigint, wallet: PublicKey) => {
  const n = Buffer.alloc(8); n.writeBigUInt64LE(round);
  return PublicKey.findProgramAddressSync([VOTE_SEED, n, wallet.toBuffer()], programId)[0];
};
const claimPda = (round: bigint, wallet: PublicKey) => {
  const n = Buffer.alloc(8); n.writeBigUInt64LE(round);
  return PublicKey.findProgramAddressSync([CLAIM_SEED, n, wallet.toBuffer()], programId)[0];
};

const u64 = (value: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(value); return b; };
const u16 = (value: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(value); return b; };

function ix(name: string, keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[], args: Buffer[] = []) {
  return new TransactionInstruction({
    programId,
    keys,
    data: Buffer.concat([discriminator("global", name), ...args]),
  });
}

async function unsignedTransaction(feePayer: PublicKey, instructions: TransactionInstruction[]) {
  const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  }).add(...instructions);
  return {
    transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  };
}

const statusName = (status: number) => ["open", "settled", "rolled_over", "closed"][status] ?? "unknown";
const iso = (seconds: bigint) => seconds > 0n ? new Date(Number(seconds) * 1000).toISOString() : null;
const tierName = (tier: number) => ["Paper Hands", "Iron Hands", "Diamond Hands", "Obsidian Hands"][tier] ?? "Paper Hands";

async function fetchConfig() {
  const info = await connection.getAccountInfo(configPda, "confirmed");
  return info ? decodeConfig(info) : null;
}

async function fetchRound(roundNumber: bigint) {
  if (roundNumber <= 0n) return null;
  const info = await connection.getAccountInfo(roundPda(roundNumber), "confirmed");
  return info ? decodeRound(info) : null;
}

function publicRound(round: Round | null) {
  if (!round) return null;
  const total = round.cooperateWeight + round.defectWeight;
  const cooperatePercent = total === 0n ? 50 : Number((round.cooperateWeight * 10_000n) / total) / 100;
  return {
    roundNumber: round.roundNumber.toString(),
    openedAt: iso(round.openedAt),
    closesAt: iso(round.closesAt),
    claimDeadline: iso(round.claimDeadline),
    potLamports: round.potLamports.toString(),
    remainingLamports: round.remainingLamports.toString(),
    cooperateWeight: round.cooperateWeight.toString(),
    defectWeight: round.defectWeight.toString(),
    cooperatePercent,
    defectPercent: 100 - cooperatePercent,
    voterCount: round.voterCount,
    status: statusName(round.status),
  };
}

async function syncProjection(config: ProtocolConfig) {
  if (!supabase) return;
  const round = await fetchRound(config.currentRound);
  await supabase.from("protocol_config").upsert({
    id: true,
    program_id: programId.toBase58(),
    token_mint: config.tokenMint.toBase58(),
    cluster: clusterName,
    current_round: config.currentRound.toString(),
    available_pool_lamports: config.availablePool.toString(),
    round_length_seconds: config.roundLengthSeconds.toString(),
    claim_window_seconds: config.claimWindowSeconds.toString(),
    defect_threshold_bps: config.defectThresholdBps,
    defector_bonus_bps: config.defectorBonusBps,
    next_round_at: iso(config.nextRoundAt),
    round_active: config.roundActive,
    paused: config.paused,
    updated_at: new Date().toISOString(),
  });
  if (round) {
    await supabase.from("rounds").upsert({
      round_number: round.roundNumber.toString(),
      status: statusName(round.status),
      opened_at: iso(round.openedAt),
      closes_at: iso(round.closesAt),
      claim_deadline: iso(round.claimDeadline),
      pot_lamports: round.potLamports.toString(),
      remaining_lamports: round.remainingLamports.toString(),
      cooperate_weight: round.cooperateWeight.toString(),
      defect_weight: round.defectWeight.toString(),
      distribution_weight: round.distributionWeight.toString(),
      voter_count: round.voterCount,
      updated_at: new Date().toISOString(),
    });
  }
}

async function syncHolders() {
  if (!supabase) return;
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: [{ memcmp: { offset: 0, bytes: bs58.encode(discriminator("account", "HolderPosition")) } }],
  });
  if (!accounts.length) return;
  const rows = accounts.map(({ account }) => {
    const p = decodePosition(account);
    return {
      wallet: p.owner.toBase58(),
      position_amount: p.amount.toString(),
      streak_started_at: iso(p.streakStartedAt),
      last_withdraw_at: iso(p.lastWithdrawAt),
      locked_until: iso(p.lockedUntil),
      bonus_bps: p.bonusBps,
      tier: p.tier,
      updated_at: new Date().toISOString(),
    };
  });
  await supabase.from("holders").upsert(rows);
}

const nonces = new Map<string, { nonce: string; expiresAt: number }>();
const faucetClaims = new Set<string>();

async function authenticate(req: Request) {
  if (!sessionKey) throw new Error("Wallet authentication is not configured.");
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Wallet sign-in is required.");
  const { payload } = await jwtVerify(token, sessionKey, { issuer: "hodlersdilemma.fun", audience: "game" });
  if (typeof payload.sub !== "string") throw new Error("Invalid wallet session.");
  return payload.sub;
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

app.get("/health", (_req, res) => {
  res.json({ ok: true, keeper: Boolean(keeper), database: Boolean(supabase), programId: programId.toBase58() });
});

app.get("/api/status", async (_req, res, next) => {
  try {
    const config = await fetchConfig();
    if (!config) {
      return res.json({ configured: false, cluster: clusterName, programId: programId.toBase58(), tokenMint: null });
    }
    const round = await fetchRound(config.currentRound);
    const tokenSupply = await connection.getTokenSupply(config.tokenMint, "confirmed");
    let activeHolders = 0;
    let longestStreakDays = 0;
    if (supabase) {
      const [{ count }, { data: oldest }] = await Promise.all([
        supabase.from("holders").select("wallet", { count: "exact", head: true }).gt("position_amount", 0),
        supabase.from("holders").select("streak_started_at").gt("position_amount", 0).order("streak_started_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      activeHolders = count ?? 0;
      if (oldest?.streak_started_at) longestStreakDays = Math.max(0, Math.floor((Date.now() - new Date(oldest.streak_started_at).getTime()) / 86_400_000));
    }
    return res.json({
      configured: true,
      cluster: clusterName,
      programId: programId.toBase58(),
      tokenMint: config.tokenMint.toBase58(),
      tokenDecimals: tokenSupply.value.decimals,
      currentRound: config.currentRound.toString(),
      availablePoolLamports: config.availablePool.toString(),
      roundLengthSeconds: config.roundLengthSeconds.toString(),
      claimWindowSeconds: config.claimWindowSeconds.toString(),
      defectThresholdBps: config.defectThresholdBps,
      defectorBonusBps: config.defectorBonusBps,
      nextRoundAt: iso(config.nextRoundAt),
      roundActive: config.roundActive,
      paused: config.paused,
      activeHolders,
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
    const message = `Hodlers Dilemma.fun\nSign in to play.\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${new Date(expiresAt).toISOString()}`;
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
    const token = await new SignJWT({ wallet }).setProtectedHeader({ alg: "HS256" }).setSubject(wallet).setIssuer("hodlersdilemma.fun").setAudience("game").setIssuedAt().setExpirationTime("12h").sign(sessionKey);
    res.json({ token, wallet, expiresIn: 43_200 });
  } catch (error) { next(error); }
});

app.get("/api/holder/:wallet", async (req, res, next) => {
  try {
    const wallet = new PublicKey(req.params.wallet);
    const config = await fetchConfig();
    let walletTokenBalance = "0";
    if (config) {
      const ownerToken = getAssociatedTokenAddressSync(config.tokenMint, wallet, false, config.tokenProgram);
      walletTokenBalance = await connection.getTokenAccountBalance(ownerToken, "confirmed")
        .then(({ value }) => value.amount)
        .catch(() => "0");
    }
    const info = await connection.getAccountInfo(positionPda(wallet), "confirmed");
    if (!info) return res.json({ wallet: wallet.toBase58(), walletTokenBalance, position: null });
    const p = decodePosition(info);
    const now = BigInt(Math.floor(Date.now() / 1000));
    res.json({
      wallet: wallet.toBase58(),
      walletTokenBalance,
      position: {
        amount: p.amount.toString(),
        streakStartedAt: iso(p.streakStartedAt),
        streakSeconds: (now - p.streakStartedAt > 0n ? now - p.streakStartedAt : 0n).toString(),
        lockedUntil: iso(p.lockedUntil),
        bonusBps: p.bonusBps,
        tier: p.tier,
        tierName: tierName(p.tier),
      },
    });
  } catch (error) { next(error); }
});

const walletBody = z.object({ wallet: z.string() });
const amountBody = walletBody.extend({ amount: z.string().regex(/^\d+$/) });

async function requireSameWallet(req: Request, expected: string) {
  const authenticated = await authenticate(req);
  if (new PublicKey(authenticated).toBase58() !== new PublicKey(expected).toBase58()) throw new Error("Wallet session does not match the transaction payer.");
}

app.post("/api/tx/open-position", async (req, res, next) => {
  try {
    const { wallet: raw } = walletBody.parse(req.body); await requireSameWallet(req, raw);
    const wallet = new PublicKey(raw); const config = await fetchConfig(); if (!config) throw new Error("Protocol is not initialized.");
    res.json(await unsignedTransaction(wallet, [ix("open_position", [
      { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: positionPda(wallet), isSigner: false, isWritable: true }, { pubkey: escrowPda(wallet), isSigner: false, isWritable: true },
      { pubkey: config.tokenMint, isSigner: false, isWritable: false }, { pubkey: config.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ])]));
  } catch (error) { next(error); }
});

app.post("/api/tx/initialize", async (req, res, next) => {
  try {
    const { wallet: raw } = walletBody.parse(req.body);
    await requireSameWallet(req, raw);
    if (!env.TOKEN_MINT || !env.INITIAL_ADMIN) throw new Error("Protocol initialization is not configured.");
    const wallet = new PublicKey(raw);
    if (!wallet.equals(new PublicKey(env.INITIAL_ADMIN))) throw new Error("Only the configured program authority can initialize the protocol.");
    if (await fetchConfig()) throw new Error("Protocol is already initialized.");
    const mint = new PublicKey(env.TOKEN_MINT);
    res.json(await unsignedTransaction(wallet, [ix("initialize", [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: programDataPda, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], [u64(3_600n), u64(604_800n), u16(5_000), u16(15_000)])]));
  } catch (error) { next(error); }
});

app.post("/api/tx/deposit", async (req, res, next) => {
  try {
    const { wallet: raw, amount } = amountBody.parse(req.body); await requireSameWallet(req, raw);
    const wallet = new PublicKey(raw); const config = await fetchConfig(); if (!config) throw new Error("Protocol is not initialized.");
    const ownerToken = getAssociatedTokenAddressSync(config.tokenMint, wallet, false, config.tokenProgram);
    res.json(await unsignedTransaction(wallet, [ix("deposit", [
      { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: positionPda(wallet), isSigner: false, isWritable: true }, { pubkey: ownerToken, isSigner: false, isWritable: true },
      { pubkey: escrowPda(wallet), isSigner: false, isWritable: true }, { pubkey: config.tokenMint, isSigner: false, isWritable: false },
      { pubkey: config.tokenProgram, isSigner: false, isWritable: false },
    ], [u64(BigInt(amount))])]));
  } catch (error) { next(error); }
});

app.post("/api/tx/withdraw", async (req, res, next) => {
  try {
    const { wallet: raw, amount } = amountBody.parse(req.body); await requireSameWallet(req, raw);
    const wallet = new PublicKey(raw); const config = await fetchConfig(); if (!config) throw new Error("Protocol is not initialized.");
    const ownerToken = getAssociatedTokenAddressSync(config.tokenMint, wallet, false, config.tokenProgram);
    res.json(await unsignedTransaction(wallet, [ix("withdraw", [
      { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: positionPda(wallet), isSigner: false, isWritable: true }, { pubkey: ownerToken, isSigner: false, isWritable: true },
      { pubkey: escrowPda(wallet), isSigner: false, isWritable: true }, { pubkey: config.tokenMint, isSigner: false, isWritable: false },
      { pubkey: config.tokenProgram, isSigner: false, isWritable: false },
    ], [u64(BigInt(amount))])]));
  } catch (error) { next(error); }
});

app.post("/api/tx/vote", async (req, res, next) => {
  try {
    const body = walletBody.extend({ choice: z.enum(["cooperate", "defect"]) }).parse(req.body); await requireSameWallet(req, body.wallet);
    const wallet = new PublicKey(body.wallet); const config = await fetchConfig(); if (!config || !config.roundActive) throw new Error("No round is currently open.");
    const round = config.currentRound;
    res.json(await unsignedTransaction(wallet, [ix("vote", [
      { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: roundPda(round), isSigner: false, isWritable: true }, { pubkey: positionPda(wallet), isSigner: false, isWritable: true },
      { pubkey: escrowPda(wallet), isSigner: false, isWritable: false }, { pubkey: config.tokenMint, isSigner: false, isWritable: false },
      { pubkey: config.tokenProgram, isSigner: false, isWritable: false }, { pubkey: votePda(round, wallet), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], [u64(round), Buffer.from([body.choice === "cooperate" ? 0 : 1])])]));
  } catch (error) { next(error); }
});

app.post("/api/tx/claim", async (req, res, next) => {
  try {
    const body = walletBody.extend({ roundNumber: z.string().regex(/^\d+$/) }).parse(req.body); await requireSameWallet(req, body.wallet);
    const wallet = new PublicKey(body.wallet); const round = BigInt(body.roundNumber);
    res.json(await unsignedTransaction(wallet, [ix("claim", [
      { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: vaultPda, isSigner: false, isWritable: true }, { pubkey: roundPda(round), isSigner: false, isWritable: true },
      { pubkey: votePda(round, wallet), isSigner: false, isWritable: false }, { pubkey: claimPda(round, wallet), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], [u64(round)])]));
  } catch (error) { next(error); }
});

app.post("/api/tx/fund", async (req, res, next) => {
  try {
    const { wallet: raw, amount } = amountBody.parse(req.body); await requireSameWallet(req, raw);
    const wallet = new PublicKey(raw);
    res.json(await unsignedTransaction(wallet, [ix("fund_vault", [
      { pubkey: wallet, isSigner: true, isWritable: true }, { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ], [u64(BigInt(amount))])]));
  } catch (error) { next(error); }
});

app.post("/api/devnet/faucet", async (req, res, next) => {
  try {
    if (!env.SOLANA_RPC_URL.includes("devnet") || !keeper) throw new Error("The devnet faucet is not enabled.");
    const { wallet: raw } = walletBody.parse(req.body); await requireSameWallet(req, raw);
    const wallet = new PublicKey(raw);
    if (faucetClaims.has(wallet.toBase58())) throw new Error("This wallet already received its devnet test allocation.");
    const config = await fetchConfig(); if (!config) throw new Error("Protocol is not initialized.");
    const supply = await connection.getTokenSupply(config.tokenMint, "confirmed");
    const account = await getOrCreateAssociatedTokenAccount(connection, keeper, config.tokenMint, wallet, false, "confirmed", undefined, config.tokenProgram);
    const amount = 1_000n * 10n ** BigInt(supply.value.decimals);
    const signature = await mintTo(connection, keeper, config.tokenMint, account.address, keeper, amount, [], undefined, config.tokenProgram);
    faucetClaims.add(wallet.toBase58());
    res.json({ signature, amount: amount.toString() });
  } catch (error) { next(error); }
});

let keeperBusy = false;
async function keeperTick() {
  if (!keeper || keeperBusy) return;
  keeperBusy = true;
  try {
    const config = await fetchConfig();
    if (!config || config.paused) return;
    const now = BigInt(Math.floor(Date.now() / 1000));
    let instruction: TransactionInstruction | undefined;
    let eventType = "";
    let detail = "";
    const currentRound = await fetchRound(config.currentRound);
    if (config.roundActive && now >= config.nextRoundAt) {
      instruction = ix("settle", [
        { pubkey: keeper.publicKey, isSigner: true, isWritable: false },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: roundPda(config.currentRound), isSigner: false, isWritable: true },
      ], [u64(config.currentRound)]);
      eventType = "ROUND_SETTLED"; detail = `Round ${config.currentRound} settlement submitted.`;
    } else if (!config.roundActive && currentRound?.status === 1 && now > currentRound.claimDeadline) {
      instruction = ix("sweep_unclaimed", [
        { pubkey: keeper.publicKey, isSigner: true, isWritable: false },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: roundPda(config.currentRound), isSigner: false, isWritable: true },
      ], [u64(config.currentRound)]);
      eventType = "UNCLAIMED_SWEPT";
      detail = `Unclaimed rewards from round ${config.currentRound} returned to the fee pool.`;
    } else if (!config.roundActive && config.availablePool > 0n && now >= config.nextRoundAt) {
      const nextRound = config.currentRound + 1n;
      instruction = ix("open_round", [
        { pubkey: keeper.publicKey, isSigner: true, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: roundPda(nextRound), isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ], [u64(nextRound)]);
      eventType = "ROUND_OPENED"; detail = `Round ${nextRound} opened for one hour.`;
    }
    if (instruction) {
      const tx = new Transaction().add(instruction);
      const signature = await connection.sendTransaction(tx, [keeper], { preflightCommitment: "confirmed", maxRetries: 3 });
      await connection.confirmTransaction(signature, "confirmed");
      if (supabase) await supabase.from("protocol_events").insert({ event_type: eventType, round_number: config.currentRound.toString(), detail, transaction_signature: signature });
    }
    const fresh = await fetchConfig();
    if (fresh) await syncProjection(fresh);
    await syncHolders();
  } catch (error) {
    console.error("keeper tick failed", error);
  } finally { keeperBusy = false; }
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next;
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  const status = /required|invalid|expired|match|initialized|open/i.test(message) ? 400 : 500;
  res.status(status).json({ error: message });
});

app.listen(env.PORT, () => {
  console.log(`Hodlers Dilemma keeper/API listening on ${env.PORT}`);
  void keeperTick();
  setInterval(() => void keeperTick(), 15_000).unref();
});
