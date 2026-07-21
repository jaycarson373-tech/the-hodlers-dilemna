export type Tier = {
  name: string;
  code: string;
  description: string;
  signal: string;
};

export type LeaderboardEntry = {
  rank: number;
  wallet: string;
  score: string;
  tier: string;
  totalSolAirdropped: string;
  wins: number;
  losses: number;
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
  { rank: 1, wallet: "9QK...D18", score: "18,420", tier: "Obsidian Hands", totalSolAirdropped: "12.84", wins: 11, losses: 2 },
  { rank: 2, wallet: "4TR...8BC", score: "16,980", tier: "Obsidian Hands", totalSolAirdropped: "10.62", wins: 10, losses: 3 },
  { rank: 3, wallet: "B71...F02", score: "12,740", tier: "Diamond Hands", totalSolAirdropped: "8.41", wins: 12, losses: 1 },
  { rank: 4, wallet: "2MA...77E", score: "9,880", tier: "Diamond Hands", totalSolAirdropped: "6.16", wins: 8, losses: 5 },
  { rank: 5, wallet: "A6F...19D", score: "7,540", tier: "Iron Hands", totalSolAirdropped: "4.38", wins: 9, losses: 4 },
  { rank: 6, wallet: "8D4...2FA", score: "5,910", tier: "Iron Hands", totalSolAirdropped: "3.07", wins: 6, losses: 7 },
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
  { label: "Under 1 hour", value: "1.0x", tier: "Paper Hands" },
  { label: "1 hour", value: "1.2x", tier: "Paper Hands" },
  { label: "2 hours", value: "1.5x", tier: "Iron Hands" },
  { label: "6 hours", value: "2.0x", tier: "Iron Hands" },
  { label: "1 day", value: "2.5x", tier: "Diamond Hands" },
  { label: "3 days", value: "3.0x", tier: "Diamond Hands" },
  { label: "7 days", value: "4.0x — cap", tier: "Obsidian Hands" },
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
