export type Tier = {
  name: string;
  code: string;
  description: string;
  signal: string;
};

export type LeaderboardEntry = {
  rank: number;
  wallet: string;
  tier: string;
  streak: string;
  record: string;
  multiplier: string;
};

export type FeedEntry = {
  time: string;
  event: string;
  detail: string;
  tone: "cooperate" | "defect" | "gold" | "neutral";
};

export type RoundHistoryEntry = {
  round: string;
  outcome: string;
  split: string;
  pot: string;
  result: string;
  tone: "cooperate" | "defect";
};

export const tiers: Tier[] = [
  {
    name: "PAPER HANDS",
    code: "BOX / 01",
    description: "Base-level streak and multiplier.",
    signal: "ENTRY STATE",
  },
  {
    name: "IRON HANDS",
    code: "BOX / 02",
    description: "Established holder with growing protocol weight.",
    signal: "CONVICTION FORMING",
  },
  {
    name: "DIAMOND HANDS",
    code: "BOX / 03",
    description: "Long-term holder with an elevated fee share.",
    signal: "POSITION HELD",
  },
  {
    name: "OBSIDIAN HANDS",
    code: "BOX / 04",
    description: "Highest-conviction tier for the longest uninterrupted streaks.",
    signal: "RARE COHORT",
  },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, wallet: "9QK...D18", tier: "Obsidian", streak: "94d", record: "11C / 2D", multiplier: "6.8x" },
  { rank: 2, wallet: "4TR...8BC", tier: "Obsidian", streak: "87d", record: "10C / 3D", multiplier: "6.4x" },
  { rank: 3, wallet: "B71...F02", tier: "Diamond", streak: "62d", record: "12C / 1D", multiplier: "5.1x" },
  { rank: 4, wallet: "2MA...77E", tier: "Diamond", streak: "41d", record: "8C / 5D", multiplier: "4.2x" },
  { rank: 5, wallet: "A6F...19D", tier: "Iron", streak: "26d", record: "9C / 4D", multiplier: "3.4x" },
  { rank: 6, wallet: "8D4...2FA", tier: "Iron", streak: "19d", record: "6C / 7D", multiplier: "2.9x" },
];

export const feed: FeedEntry[] = [
  { time: "T−19:42", event: "ROUND 023 SETTLED", detail: "Majority chose HODL. Pot distributed.", tone: "cooperate" },
  { time: "T−18:07", event: "WALLET 8D4...2FA TOOK THE DEAL", detail: "Dealer bonus activated.", tone: "defect" },
  { time: "T−14:31", event: "BETRAYAL BOUNTY FUNDED", detail: "A 19-day streak was forfeited.", tone: "gold" },
  { time: "T−08:12", event: "BANKER’S OFFER REFUSED", detail: "412 wallets said no hodl? No. HODL.", tone: "gold" },
  { time: "T−00:00", event: "ROUND 024 OPENED", detail: "Decision window is now active.", tone: "neutral" },
];

export const roundHistory: RoundHistoryEntry[] = [
  { round: "023", outcome: "MAJORITY HODLED", split: "67% / 33%", pot: "124.18 SOL", result: "DISTRIBUTED", tone: "cooperate" },
  { round: "022", outcome: "TOO MANY TOOK THE OFFER", split: "46% / 54%", pot: "81.30 SOL", result: "ROLLED OVER", tone: "defect" },
  { round: "021", outcome: "MAJORITY HODLED", split: "71% / 29%", pot: "76.44 SOL", result: "DISTRIBUTED", tone: "cooperate" },
  { round: "020", outcome: "TOO MANY TOOK THE OFFER", split: "48% / 52%", pot: "42.06 SOL", result: "ROLLED OVER", tone: "defect" },
];

export const mechanics = [
  { number: "01", title: "Pick Up Your Box", copy: "Acquire the token and begin building an uninterrupted streak." },
  { number: "02", title: "Build Conviction", copy: "Holding time and position strength increase your protocol weight." },
  { number: "03", title: "Answer the Phone", copy: "Hodl or no hodl — decide during recurring rounds and submit a choice." },
  { number: "04", title: "Open the Box", copy: "Outcomes depend on your decision, the collective result, and your multiplier." },
  { number: "05", title: "Remain Standing", copy: "Refuse the banker, climb the tiers, and compete in seasonal rankings." },
];

export const streakSteps = [
  { label: "DAY 1", value: "1.0x" },
  { label: "DAY 3", value: "1.5x" },
  { label: "WEEK 1", value: "2.0x" },
  { label: "WEEK 2", value: "3.0x" },
  { label: "LONG-TERM", value: "CONTINUING" },
];

export const outcomes = [
  {
    you: "YOU HODL",
    majority: "MAJORITY HODL",
    title: "WEIGHTED SHARE",
    copy: "The box opens for everyone. You receive the standard weighted fee share.",
    tone: "cooperate",
  },
  {
    you: "YOU HODL",
    majority: "TOO MANY TAKE THE DEAL",
    title: "BOX STAYS SEALED",
    copy: "No payout. The pot rolls into the next round’s box.",
    tone: "neutral",
  },
  {
    you: "YOU TAKE THE DEAL",
    majority: "MAJORITY HODL",
    title: "INCREASED SHARE",
    copy: "You receive an increased share of the round.",
    tone: "defect",
  },
  {
    you: "YOU TAKE THE DEAL",
    majority: "TOO MANY TAKE THE DEAL",
    title: "MUTUAL LOSS",
    copy: "No payout. The pot rolls into the next round.",
    tone: "defect",
  },
] as const;
