export type ProtocolRound = {
  roundNumber: string;
  openedAt: string | null;
  closesAt: string | null;
  claimDeadline: string | null;
  potLamports: string;
  remainingLamports: string;
  cooperatePercent: number | null;
  defectPercent: number | null;
  voterCount: number;
  dealBudgetLamports?: string;
  acceptedDealsLamports?: string;
  hodlPoolLamports?: string;
  rolloverLamports?: string;
  weightedHodlBps?: number | null;
  forceOpen?: boolean;
  settledAt?: string | null;
  status: "open" | "settled" | "rolled_over" | "closed";
};

export type ProtocolStatus = {
  configured: boolean;
  cluster: string;
  programId: string;
  tokenMint: string | null;
  tokenDecimals?: number;
  currentRound?: string;
  availablePoolLamports?: string;
  roundLengthSeconds?: string;
  decisionWindowSeconds?: string;
  cooperationThresholdBps?: number;
  boxAllocationBps?: number;
  bankerAllocationBps?: number;
  airdropAllocationBps?: number;
  boxWallet?: string | null;
  bankerWallet?: string | null;
  airdropWallet?: string | null;
  boxWalletBalanceLamports?: string;
  bankerWalletBalanceLamports?: string;
  airdropWalletBalanceLamports?: string;
  nextRoundAt?: string | null;
  roundActive?: boolean;
  paused?: boolean;
  activeHolders?: number;
  longestStreakDays?: number;
  minHoldingTokens?: string;
  potRolloverCount?: number;
  failedRoundCount?: number;
  round?: ProtocolRound | null;
};

export type RoundHistoryEntry = {
  roundNumber: string;
  result: "HOLD" | "JEET" | "LIVE" | "CLOSED";
  status: ProtocolRound["status"];
  potLamports: string;
  paidLamports: string;
  rolloverLamports: string;
  holdPercent: number | null;
  jeetPercent: number | null;
  voterCount: number;
  openedAt: string | null;
  settledAt: string | null;
};

export type HolderState = {
  wallet: string;
  walletTokenBalance: string;
  snapshotBalance: string;
  multiplierBps: number;
  playerWeight: string;
  bankerOfferLamports: string;
  projectedShareLamports: string;
  participationStatus: string;
  soldThisRound: boolean;
  position: null | {
    amount: string;
    streakStartedAt: string | null;
    streakSeconds: string;
    lockedUntil: string | null;
    bonusBps: number;
    tier: number;
    tierName: string;
  };
};

type ApiError = { error?: string };

export const normalizeProtocolApiUrl = (value?: string) => {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const absolute = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return absolute.replace(/\/api$/i, "");
};

export const protocolApiUrl = normalizeProtocolApiUrl(process.env.NEXT_PUBLIC_API_URL);

const publicGameError = (message?: string) => {
  const text = message ?? "";
  if (
    /api|railway|supabase|token_mint|database|configured|configuration|next_public|health|column|relation|schema|fetch|request failed|network/i.test(text)
  ) {
    return "The live dilemma could not be completed. Try again.";
  }
  return text || "No live result available yet. Waiting for the next dilemma.";
};

export async function protocolRequest<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  if (!protocolApiUrl) throw new Error("The live dilemma could not be completed. Try again.");
  const requestUrl = `${protocolApiUrl}${path}`;
  const response = await fetch(requestUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  }).catch(() => {
    throw new Error("The live dilemma could not be completed. Try again.");
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    throw new Error(publicGameError(body.error || `Request failed ${response.status}`));
  }
  return body;
}

export const tokenAmountToBaseUnits = (value: string, decimals: number) => {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) throw new Error("Enter a valid token amount.");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) throw new Error(`This token supports at most ${decimals} decimal places.`);
  return `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
};

export const baseUnitsToTokenAmount = (value: string, decimals: number) => {
  const padded = value.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, "") : "";
  return fraction ? `${whole}.${fraction}` : whole;
};

export const lamportsToSol = (value?: string) =>
  ((Number(value ?? "0") || 0) / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 4 });
