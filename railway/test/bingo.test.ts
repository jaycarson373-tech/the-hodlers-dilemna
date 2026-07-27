import assert from "node:assert/strict";
import test from "node:test";

import {
  cardCountForBalance,
  cardHasBingo,
  generateBingoCard,
  generateDrawOrder,
  isWithinSupplyEligibilityCap,
  jackpotHits,
  numberLabel,
  seedCommitment,
  selectWinningCard,
} from "../src/bingo.js";

const seed = "4d0e469ee5884a768432e07f52d3f754";
const wallet = "9AxqEtqF96VeL2aKfjjbVa6pNd1C2yGV9tKXcGPJxVMn";

test("generates deterministic valid 5x5 cards", () => {
  const card = generateBingoCard(seed, "1", wallet, 0);
  assert.deepEqual(card, generateBingoCard(seed, "1", wallet, 0));
  assert.equal(card.length, 25);
  assert.equal(card[12], 0);
  for (let column = 0; column < 5; column += 1) {
    const values = [0, 1, 2, 3, 4]
      .map((row) => card[row * 5 + column])
      .filter((value) => value !== 0);
    assert.equal(new Set(values).size, values.length);
    for (const value of values) {
      assert.ok(value >= column * 15 + 1);
      assert.ok(value <= column * 15 + 15);
    }
  }
});

test("draw order contains all 75 balls exactly once", () => {
  const draw = generateDrawOrder(seed, "8");
  assert.equal(draw.length, 75);
  assert.equal(new Set(draw).size, 75);
  assert.deepEqual([...draw].sort((a, b) => a - b), Array.from({ length: 75 }, (_, index) => index + 1));
});

test("recognizes rows, columns, and the free center", () => {
  const card = generateBingoCard(seed, "1", wallet, 0);
  assert.equal(cardHasBingo(card, card.slice(0, 5)), true);
  assert.equal(cardHasBingo(card, [card[2], card[7], card[17], card[22]]), true);
  assert.equal(cardHasBingo(card, [card[0], card[1], card[3]]), false);
});

test("selects the first completed card deterministically", () => {
  const draw = generateDrawOrder(seed, "2");
  const winner = selectWinningCard(seed, "2", [
    { wallet, cardCount: 3 },
    { wallet: "11111111111111111111111111111111", cardCount: 2 },
  ], draw);
  assert.ok(winner);
  assert.ok(winner.completedAtCall >= 4);
  assert.deepEqual(winner, selectWinningCard(seed, "2", [
    { wallet, cardCount: 3 },
    { wallet: "11111111111111111111111111111111", cardCount: 2 },
  ], draw));
});

test("converts balance to one card per threshold", () => {
  assert.equal(cardCountForBalance(999_999n, 1_000_000n), 0);
  assert.equal(cardCountForBalance(5_999_999n, 1_000_000n), 5);
  assert.equal(cardCountForBalance(199_999n, 200_000n), 0);
  assert.equal(cardCountForBalance(869_607_838_589n, 200_000_000_000n), 4);
  assert.equal(cardCountForBalance(353_134_727_201n, 200_000_000_000n), 1);
});

test("excludes balances above five percent of supply", () => {
  const supply = 1_000_000_000_000_000n;
  assert.equal(isWithinSupplyEligibilityCap(50_000_000_000_000n, supply), true);
  assert.equal(isWithinSupplyEligibilityCap(50_000_000_000_001n, supply), false);
  assert.equal(isWithinSupplyEligibilityCap(996_000_000_000_000n, supply), false);
});

test("commitments, jackpot roll, and number labels are stable", () => {
  assert.equal(seedCommitment(seed), seedCommitment(seed));
  assert.equal(jackpotHits(seed, "7", 25), jackpotHits(seed, "7", 25));
  assert.equal(numberLabel(1), "B-1");
  assert.equal(numberLabel(75), "O-75");
});
