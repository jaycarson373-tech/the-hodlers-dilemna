import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const root = resolve(import.meta.dirname, "../..");
const deployDir = resolve(root, "target/deploy");
const adminPath = process.env.DEVNET_ADMIN_KEYPAIR ?? resolve(deployDir, "devnet-admin.json");
const keeperPath = process.env.DEVNET_KEEPER_KEYPAIR ?? resolve(deployDir, "devnet-keeper.json");
const mintPath = resolve(deployDir, "devnet-token-mint.txt");
const envPath = resolve(deployDir, "devnet-env.txt");
const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const programId = new PublicKey(process.env.PROTOCOL_PROGRAM_ID ?? "GT42vQcCtut8XU4z7rm9MAoGrV462xB7qK16CDgMgWha");
const connection = new Connection(rpcUrl, "confirmed");

const loadKeypair = async (path: string) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path, "utf8")) as number[]));
const discriminator = (name: string) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
const u64 = (value: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(value); return b; };
const u16 = (value: number) => { const b = Buffer.alloc(2); b.writeUInt16LE(value); return b; };

await mkdir(deployDir, { recursive: true });
const admin = await loadKeypair(adminPath);
const keeper = await loadKeypair(keeperPath);
const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("sol-vault")], programId);

const program = await connection.getAccountInfo(programId, "confirmed");
if (!program?.executable) throw new Error(`Deploy ${programId.toBase58()} to devnet before running the bootstrap.`);

const adminBalance = await connection.getBalance(admin.publicKey, "confirmed");
if (adminBalance < 0.8 * LAMPORTS_PER_SOL) {
  throw new Error(`Fund devnet admin ${admin.publicKey.toBase58()} with at least 0.8 devnet SOL, then rerun.`);
}

let tokenMint: PublicKey;
try {
  tokenMint = new PublicKey((await readFile(mintPath, "utf8")).trim());
} catch {
  tokenMint = await createMint(connection, admin, keeper.publicKey, null, 6, undefined, undefined, TOKEN_PROGRAM_ID);
  await writeFile(mintPath, `${tokenMint.toBase58()}\n`, { mode: 0o600 });
}

if (!(await connection.getAccountInfo(configPda, "confirmed"))) {
  const initialize = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: false },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("initialize"), u64(3_600n), u64(604_800n), u16(5_000), u16(15_000)]),
  });
  await sendAndConfirmTransaction(connection, new Transaction().add(initialize), [admin], { commitment: "confirmed" });

  const fund = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("fund_vault"), u64(250_000_000n)]),
  });
  const keeperFunding = SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: keeper.publicKey, lamports: 100_000_000 });
  await sendAndConfirmTransaction(connection, new Transaction().add(fund, keeperFunding), [admin], { commitment: "confirmed" });
}

const keeperSecret = Buffer.from(keeper.secretKey).toString("base64");
const sessionSecret = randomBytes(48).toString("base64url");
const contents = [
  "# Railway",
  `SOLANA_RPC_URL=${rpcUrl}`,
  `PROTOCOL_PROGRAM_ID=${programId.toBase58()}`,
  `SESSION_SECRET=${sessionSecret}`,
  `KEEPER_KEYPAIR_BASE64=${keeperSecret}`,
  "",
  "# Vercel",
  `NEXT_PUBLIC_SOLANA_RPC_URL=${rpcUrl}`,
  "NEXT_PUBLIC_API_URL=<YOUR_RAILWAY_PUBLIC_URL>",
  "",
].join("\n");
await writeFile(envPath, contents, { mode: 0o600 });
await chmod(envPath, 0o600);

console.log(`Devnet protocol initialized. Token mint: ${tokenMint.toBase58()}`);
console.log(`Private deployment values written to ${envPath}`);
