"use client";

import { useCallback, useEffect, useState } from "react";
import { lamportsToSol, protocolRequest, type RoundHistoryEntry } from "@/lib/protocol-api";

const resultLabel = (entry: RoundHistoryEntry) => {
  if (entry.result === "ROLLOVER") return "ROLLED";
  if (entry.result === "WINNER") return entry.jackpotTriggered ? "JACKPOT" : "WINNER";
  if (entry.result === "LIVE") return "LIVE";
  return "CLOSED";
};

const resultDetail = (entry: RoundHistoryEntry) => {
  if (entry.result === "ROLLOVER") return "Pool rolled into the next draw";
  if (entry.result === "WINNER") return entry.jackpotTriggered ? "Main prize and jackpot paid" : "Winning card paid";
  if (entry.result === "LIVE") return "Draw in progress";
  return "Draw closed";
};

const validSolanaSignature = (value?: string | null) => (
  value && /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(value) ? value : null
);

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes > 0 ? `${minutes}m ${String(remainder).padStart(2, "0")}s` : `${remainder}s`;
};

export function RoundHistoryBoard() {
  const [rounds, setRounds] = useState<RoundHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await protocolRequest<RoundHistoryEntry[]>("/api/round-history");
      setRounds(next);
    } catch {
      setRounds([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 20_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const visibleRounds = rounds.slice(0, 12);
  const settledRounds = rounds.filter((round) => round.result === "ROLLOVER" || round.result === "WINNER" || round.result === "CLOSED");
  const lastSettled = settledRounds[0];
  const completedDurations = settledRounds.flatMap((round) => {
    if (!round.openedAt || !round.settledAt) return [];
    const duration = (new Date(round.settledAt).getTime() - new Date(round.openedAt).getTime()) / 1_000;
    return Number.isFinite(duration) && duration > 0 ? [duration] : [];
  });
  const averageDuration = completedDurations.length
    ? formatDuration(completedDurations.reduce((total, duration) => total + duration, 0) / completedDurations.length)
    : null;
  const totalPaidLamports = settledRounds.reduce((total, round) => {
    try {
      return total + BigInt(round.paidLamports || "0");
    } catch {
      return total;
    }
  }, 0n).toString();

  return (
    <section className="roulette-history-board" aria-labelledby="roulette-history-title">
      <header>
        <span>THE LEDGER / SETTLED DRAWS</span>
        <h2 id="roulette-history-title">EVERY CALL LEAVES A RECEIPT.</h2>
        <p>Numbers called. Card completed. Wallet paid. Permanently recorded.</p>
      </header>

      {visibleRounds.length ? (
        <>
          <div className="roulette-history-strip" aria-label="Previous round results">
            {visibleRounds.map((entry) => (
              <article className={`roulette-spin is-${entry.result.toLowerCase()}`} key={entry.roundNumber}>
                <small>ROUND {entry.roundNumber.padStart(3, "0")}</small>
                <strong>{resultLabel(entry)}</strong>
                <span>{entry.result === "WINNER" && entry.winnerWallet ? entry.winnerWallet.slice(0, 4) + "…" + entry.winnerWallet.slice(-4) : entry.result === "ROLLOVER" ? "NO FULL HOUSE" : "DRAW ACTIVE"}</span>
                <em>{Number(entry.paidLamports) > 0 ? `${lamportsToSol(entry.paidLamports)} SOL PAID` : entry.result === "ROLLOVER" ? `${lamportsToSol(entry.rolloverLamports)} SOL ROLLED` : "RESULT PENDING"}</em>
                {validSolanaSignature(entry.settlementSignature) ? (
                  <a href={`https://solscan.io/tx/${entry.settlementSignature}`} target="_blank" rel="noreferrer">SOLSCAN ↗</a>
                ) : null}
              </article>
            ))}
          </div>

          <div className="roulette-history-details">
            <article>
              <span>SETTLED DRAWS</span>
              <strong>{settledRounds.length}</strong>
              <p>Real completed games recorded by the hall.</p>
            </article>
            <article>
              <span>TOTAL PAID</span>
              <strong>{lamportsToSol(totalPaidLamports)} SOL</strong>
              <p>Confirmed payouts across every settled draw.</p>
            </article>
            <article>
              <span>LATEST PAYOUT</span>
              <strong>{lastSettled && Number(lastSettled.paidLamports) > 0 ? `${lamportsToSol(lastSettled.paidLamports)} SOL` : "NONE YET"}</strong>
              <p>{lastSettled ? resultDetail(lastSettled) : "The first winner writes the first receipt."}</p>
            </article>
            <article>
              <span>AVERAGE DRAW</span>
              <strong>{averageDuration ?? "PENDING"}</strong>
              <p>Measured from real completed games.</p>
            </article>
            <article>
              <span>LIVE BOARD</span>
              <strong>{rounds[0]?.result === "LIVE" ? "CALLING" : "READY"}</strong>
              <p>{rounds[0]?.result === "LIVE" ? "The current draw is live." : "The hall is ready for the next draw."}</p>
            </article>
          </div>
        </>
      ) : (
        <div className="roulette-history-empty">
          <strong>{loaded ? "THE FIRST DRAW WRITES THE FIRST LINE." : "VERIFYING THE BOARD."}</strong>
          <span>No staged winners. Only settled, verifiable draws appear here.</span>
        </div>
      )}
    </section>
  );
}
