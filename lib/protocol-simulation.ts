import type { ProtocolStatus } from "@/lib/protocol-api";

export const SIMULATION_COUNTDOWN_SECONDS = 4 * 60 * 60 + 12 * 60 + 33;

export const simulationStatus: ProtocolStatus = {
  configured: false,
  cluster: "simulation",
  programId: "simulation",
  tokenMint: null,
  tokenDecimals: 6,
  currentRound: "024",
  availablePoolLamports: "4218000000",
  roundLengthSeconds: String(6 * 60 * 60),
  roundActive: true,
  activeHolders: 842,
  longestStreakDays: 18,
  potRolloverCount: 2,
  round: {
    roundNumber: "024",
    openedAt: null,
    closesAt: null,
    claimDeadline: null,
    potLamports: "4218000000",
    remainingLamports: "4218000000",
    cooperatePercent: 62,
    defectPercent: 38,
    voterCount: 0,
    status: "open",
  },
};
