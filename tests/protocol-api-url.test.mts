import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProtocolApiUrl } from "../lib/protocol-api.ts";

test("normalizes a bare Railway hostname", () => {
  assert.equal(
    normalizeProtocolApiUrl("game-api.up.railway.app"),
    "https://game-api.up.railway.app",
  );
});

test("removes trailing slashes and a mistaken /api suffix", () => {
  assert.equal(
    normalizeProtocolApiUrl("https://game-api.up.railway.app/api///"),
    "https://game-api.up.railway.app",
  );
});

test("preserves an explicit local HTTP endpoint", () => {
  assert.equal(
    normalizeProtocolApiUrl("http://localhost:3001/"),
    "http://localhost:3001",
  );
});

test("keeps missing configuration empty", () => {
  assert.equal(normalizeProtocolApiUrl(), "");
  assert.equal(normalizeProtocolApiUrl("   "), "");
});
