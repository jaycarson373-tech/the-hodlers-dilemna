import assert from "node:assert/strict";
import test from "node:test";

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

import { parseKeypairValue } from "../src/keypairs.js";

const source = Keypair.generate();
const expectedAddress = source.publicKey.toBase58();

test("parses a Solana CLI JSON keypair", () => {
  const parsed = parseKeypairValue(JSON.stringify(Array.from(source.secretKey)));
  assert.equal(parsed.publicKey.toBase58(), expectedAddress);
});

test("parses a base58 secret key before attempting base64", () => {
  const parsed = parseKeypairValue(bs58.encode(source.secretKey));
  assert.equal(parsed.publicKey.toBase58(), expectedAddress);
});

test("parses a strict base64 secret key", () => {
  const parsed = parseKeypairValue(Buffer.from(source.secretKey).toString("base64"));
  assert.equal(parsed.publicKey.toBase58(), expectedAddress);
});

test("rejects ambiguous or malformed values", () => {
  assert.throws(() => parseKeypairValue("not-a-private-key"), /64-byte Solana secret key/);
});
