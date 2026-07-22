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
