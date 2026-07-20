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

export const tiers: Tier[] = [
  {
    name: "Paper Hands",
    code: "TIER / 01",
    description: "Base-level streak and multiplier.",
    signal: "ENTRY STATE",
  },
  {
    name: "Iron Hands",
    code: "TIER / 02",
    description: "Established holder with growing protocol weight.",
    signal: "CONVICTION FORMING",
  },
  {
    name: "Diamond Hands",
    code: "TIER / 03",
    description: "Long-term holder with an elevated fee share.",
    signal: "POSITION HELD",
  },
  {
    name: "Obsidian Hands",
    code: "TIER / 04",
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
  { time: "T−19:42", event: "ROUND 023 SETTLED", detail: "Majority cooperated. Pot distributed.", tone: "cooperate" },
  { time: "T−18:07", event: "WALLET 8D4...2FA DEFECTED", detail: "Defector bonus activated.", tone: "defect" },
  { time: "T−14:31", event: "BETRAYAL BOUNTY FUNDED", detail: "A 19-day streak was forfeited.", tone: "gold" },
  { time: "T−08:12", event: "TEMPTATION EVENT SURVIVED", detail: "412 wallets maintained their streak.", tone: "gold" },
  { time: "T−00:00", event: "ROUND 024 OPENED", detail: "Decision window is now active.", tone: "neutral" },
];

export const mechanics = [
  { number: "01", title: "Hold", copy: "Acquire the token and begin building an uninterrupted streak." },
  { number: "02", title: "Build Conviction", copy: "Holding time and position strength increase your protocol weight." },
  { number: "03", title: "Face the Dilemma", copy: "Choose to cooperate or defect during recurring rounds." },
  { number: "04", title: "Receive Outcomes", copy: "Outcomes depend on your decision, the collective result, and your multiplier." },
  { number: "05", title: "Remain Standing", copy: "Avoid selling, climb the tiers, and compete in seasonal rankings." },
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
    you: "YOU COOPERATE",
    majority: "MAJORITY COOPERATES",
    title: "WEIGHTED SHARE",
    copy: "You receive the standard weighted fee share.",
    tone: "cooperate",
  },
  {
    you: "YOU COOPERATE",
    majority: "TOO MANY DEFECT",
    title: "POT ROLLS OVER",
    copy: "No payout. The pot rolls into the next round.",
    tone: "neutral",
  },
  {
    you: "YOU DEFECT",
    majority: "MAJORITY COOPERATES",
    title: "INCREASED SHARE",
    copy: "You receive an increased share of the round.",
    tone: "defect",
  },
  {
    you: "YOU DEFECT",
    majority: "TOO MANY DEFECT",
    title: "MUTUAL LOSS",
    copy: "No payout. The pot rolls into the next round.",
    tone: "defect",
  },
] as const;
