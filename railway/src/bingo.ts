import { createHash } from "node:crypto";

export const BINGO_COLUMNS = ["B", "I", "N", "G", "O"] as const;
export const FREE_SPACE = 0;

export type BingoCard = [
  number, number, number, number, number,
  number, number, number, number, number,
  number, number, 0, number, number,
  number, number, number, number, number,
  number, number, number, number, number,
];

export type BingoEntry = {
  wallet: string;
  cardCount: number;
};

export type WinningCard = {
  wallet: string;
  cardIndex: number;
  card: BingoCard;
  completedAtCall: number;
  tieBreak: string;
};

const sha256Buffer = (value: string | Buffer) =>
  createHash("sha256").update(value).digest();

export const sha256Hex = (value: string | Buffer) =>
  sha256Buffer(value).toString("hex");

export const seedCommitment = (seed: string) => sha256Hex(seed);

const deterministicUint32 = (seed: string, namespace: string, counter: number) =>
  sha256Buffer(`${seed}:${namespace}:${counter}`).readUInt32BE(0);

const shuffledRange = (start: number, end: number, seed: string, namespace: string) => {
  const values = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = deterministicUint32(seed, namespace, index) % (index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
};

export function generateBingoCard(
  seed: string,
  gameNumber: string,
  wallet: string,
  cardIndex: number,
): BingoCard {
  if (!Number.isSafeInteger(cardIndex) || cardIndex < 0) {
    throw new Error("Card index must be a non-negative safe integer.");
  }

  const columns = BINGO_COLUMNS.map((letter, column) =>
    shuffledRange(
      column * 15 + 1,
      column * 15 + 15,
      seed,
      `card:${gameNumber}:${wallet}:${cardIndex}:${letter}`,
    ).slice(0, 5),
  );

  const card: number[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      card.push(row === 2 && column === 2 ? FREE_SPACE : columns[column][row]);
    }
  }
  return card as BingoCard;
}

export function generateDrawOrder(seed: string, gameNumber: string) {
  return shuffledRange(1, 75, seed, `draw:${gameNumber}`);
}

const WINNING_LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
] as const;

export function cardHasBingo(card: BingoCard, calledNumbers: readonly number[]) {
  const called = new Set(calledNumbers);
  return WINNING_LINES.some((line) =>
    line.every((index) => card[index] === FREE_SPACE || called.has(card[index])),
  );
}

export function completedAtCall(card: BingoCard, drawOrder: readonly number[]) {
  for (let callCount = 4; callCount <= drawOrder.length; callCount += 1) {
    if (cardHasBingo(card, drawOrder.slice(0, callCount))) return callCount;
  }
  return null;
}

export function selectWinningCard(
  seed: string,
  gameNumber: string,
  entries: readonly BingoEntry[],
  drawOrder: readonly number[],
): WinningCard | null {
  const winners: WinningCard[] = [];
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.cardCount) || entry.cardCount < 0) {
      throw new Error(`Invalid card count for ${entry.wallet}.`);
    }
    for (let cardIndex = 0; cardIndex < entry.cardCount; cardIndex += 1) {
      const card = generateBingoCard(seed, gameNumber, entry.wallet, cardIndex);
      const completion = completedAtCall(card, drawOrder);
      if (completion === null) continue;
      winners.push({
        wallet: entry.wallet,
        cardIndex,
        card,
        completedAtCall: completion,
        tieBreak: sha256Hex(`${seed}:winner:${gameNumber}:${entry.wallet}:${cardIndex}`),
      });
    }
  }

  return winners.sort((left, right) =>
    left.completedAtCall - right.completedAtCall
    || left.tieBreak.localeCompare(right.tieBreak),
  )[0] ?? null;
}

export function cardCountForBalance(balanceBaseUnits: bigint, cardPriceBaseUnits: bigint) {
  if (cardPriceBaseUnits <= 0n) throw new Error("Card price must be positive.");
  const count = balanceBaseUnits / cardPriceBaseUnits;
  if (count > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Card count exceeds the safe limit.");
  return Number(count);
}

export function isWithinSupplyEligibilityCap(balanceBaseUnits: bigint, totalSupplyBaseUnits: bigint) {
  if (balanceBaseUnits < 0n || totalSupplyBaseUnits <= 0n) return false;
  return balanceBaseUnits <= totalSupplyBaseUnits / 20n;
}

export function jackpotHits(seed: string, gameNumber: string, odds: number) {
  if (!Number.isSafeInteger(odds) || odds < 1) throw new Error("Jackpot odds must be a positive integer.");
  const roll = deterministicUint32(seed, `jackpot:${gameNumber}`, 0) % odds;
  return roll === 0;
}

export function numberLabel(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 75) throw new Error("Bingo number must be between 1 and 75.");
  return `${BINGO_COLUMNS[Math.floor((value - 1) / 15)]}-${value}`;
}
