import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

function keypairFromBytes(bytes: Uint8Array) {
  if (bytes.length !== 64) {
    throw new Error(`Expected 64 secret-key bytes, received ${bytes.length}.`);
  }
  return Keypair.fromSecretKey(bytes);
}

function parseJsonBytes(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    throw new Error("JSON keypair must be an array of byte values.");
  }
  return keypairFromBytes(Uint8Array.from(parsed));
}

function decodeStrictBase64(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return null;
  const decoded = Buffer.from(value, "base64");
  const normalizedInput = value.replace(/=+$/, "");
  const normalizedOutput = decoded.toString("base64").replace(/=+$/, "");
  return normalizedInput === normalizedOutput ? decoded : null;
}

/** Accept Solana CLI JSON arrays, base58 secret keys, or strict base64. */
export function parseKeypairValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Keypair value is empty.");
  if (trimmed.startsWith("[")) return parseJsonBytes(trimmed);

  if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
    const decodedBase58 = bs58.decode(trimmed);
    if (decodedBase58.length === 64) return keypairFromBytes(decodedBase58);
  }

  const decodedBase64 = decodeStrictBase64(trimmed);
  if (decodedBase64?.[0] === 91) return parseJsonBytes(decodedBase64.toString("utf8"));
  if (decodedBase64?.length === 64) return keypairFromBytes(decodedBase64);

  throw new Error("Expected a 64-byte Solana secret key encoded as JSON, base58, or base64.");
}
