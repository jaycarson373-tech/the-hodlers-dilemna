export type ProtocolRound = {
  roundNumber: string;
  openedAt: string | null;
  closesAt: string | null;
  claimDeadline: string | null;
  potLamports: string;
  remainingLamports: string;
  cooperatePercent: number;
  defectPercent: number;
  voterCount: number;
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
  nextRoundAt?: string | null;
  roundActive?: boolean;
  paused?: boolean;
  activeHolders?: number;
  longestStreakDays?: number;
  round?: ProtocolRound | null;
};

export type HolderState = {
  wallet: string;
  walletTokenBalance: string;
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

export const protocolApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export async function protocolRequest<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  if (!protocolApiUrl) throw new Error("The game API has not been connected to this deployment yet.");
  const response = await fetch(`${protocolApiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(body.error || `Game API request failed (${response.status}).`);
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
