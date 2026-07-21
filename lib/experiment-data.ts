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
  { time: "20:45", event: "FEES SWEPT", detail: "0.184 SOL entered the box.", tone: "gold" },
  { time: "20:30", event: "BANKER REVIEWING", detail: "Episode 024 remains sealed.", tone: "neutral" },
  { time: "20:15", event: "FEES SWEPT", detail: "0.096 SOL entered the box.", tone: "gold" },
  { time: "20:00", event: "EPISODE 024 OPENED", detail: "Snapshot balances are locked for this episode.", tone: "cooperate" },
  { time: "19:59", event: "LAST BOX OPENED", detail: "Weighted HODL cleared the 70% line.", tone: "cooperate" },
];

export const roundHistory: RoundHistoryEntry[] = [
  { round: "NEXT", outcome: "BANKER ONLINE", split: "Awaiting holders", pot: "Awaiting funded pot", result: "Waiting for the next call", tone: "cooperate" },
  { round: "LOCKED", outcome: "CASE SEALED", split: "Decision pending", pot: "No offer available yet", result: "Waiting for call", tone: "defect" },
  { round: "CALL", outcome: "OFFER INCOMING", split: "Board locked", pot: "Case value hidden", result: "Banker reviewing", tone: "cooperate" },
  { round: "OPEN", outcome: "CASE OPENING", split: "HODL or NO HODL", pot: "Revealed when live", result: "Offer pending", tone: "defect" },
];

export const mechanics = [
  { number: "01", title: "Pick Up Your Box", copy: "Acquire the token and begin building an uninterrupted streak." },
  { number: "02", title: "Build Conviction", copy: "Holding time and position strength increase your protocol weight." },
  { number: "03", title: "Answer the Phone", copy: "Hodl or no hodl — decide during recurring rounds and submit a choice." },
  { number: "04", title: "Open the Box", copy: "Outcomes depend on your decision, the collective result, and your multiplier." },
  { number: "05", title: "Remain Standing", copy: "Refuse the banker, climb the tiers, and compete in seasonal rankings." },
];

export const streakSteps = [
  { label: "0", value: "1.0x" },
  { label: "1–2", value: "1.1x" },
  { label: "3–5", value: "1.25x" },
  { label: "6–9", value: "1.5x" },
  { label: "10+", value: "2.0x" },
];

export const outcomes = [
  {
    you: "OUTCOME A",
    majority: "HODL OR SILENT / LINE HOLDS",
    title: "BOX OPENS",
    copy: "Split the main pot (80% of fees) by payout weight. Your streak increases by one.",
    tone: "cooperate",
  },
  {
    you: "OUTCOME B",
    majority: "SIGNED NO HODL / LINE HOLDS",
    title: "DEFECTOR'S DEAL",
    copy: "Paid at 1.5x weight from the capped 20% tranche. Your streak drops one tier.",
    tone: "defect",
  },
  {
    you: "OUTCOME C",
    majority: "WEIGHTED HODL BELOW 70%",
    title: "MUTUAL LOSS",
    copy: "Nobody is paid. The full pot rolls into the next box. Defectors still take the tier penalty.",
    tone: "defect",
  },
  {
    you: "OUTCOME D",
    majority: "BALANCE DECREASE DETECTED",
    title: "SELLER",
    copy: "Forced NO HODL. Full streak reset. No defector tranche and no payout.",
    tone: "defect",
  },
] as const;
