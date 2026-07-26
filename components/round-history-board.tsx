"use client";

import { useCallback, useEffect, useState } from "react";
import { lamportsToSol, protocolRequest, type RoundHistoryEntry } from "@/lib/protocol-api";

const resultLabel = (entry: RoundHistoryEntry) => {
  if (entry.result === "HOLD") return "ROLLED";
  if (entry.result === "JEET") return "WINNER";
  if (entry.result === "LIVE") return "LIVE";
  return "CLOSED";
};

const resultDetail = (entry: RoundHistoryEntry) => {
  if (entry.result === "HOLD") return "Pool rolled into the next draw";
  if (entry.result === "JEET") return "Winning card paid";
  if (entry.result === "LIVE") return "Draw in progress";
  return "Draw closed";
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

  const visibleRounds = rounds.slice(0, 24);
  const lastSettled = rounds.find((round) => round.result === "HOLD" || round.result === "JEET");

  return (
    <section className="roulette-history-board" aria-labelledby="roulette-history-title">
      <header>
        <span>PREVIOUS DRAWS / ON-CHAIN BINGO</span>
        <h2 id="roulette-history-title">EVERY GAME GETS CALLED.</h2>
        <p>Every settled draw prints a result: winner paid, pool rolled, or jackpot triggered.</p>
      </header>

      {visibleRounds.length ? (
        <>
          <div className="roulette-history-strip" aria-label="Previous round results">
            {visibleRounds.map((entry) => (
              <article className={`roulette-spin is-${entry.result.toLowerCase()}`} key={entry.roundNumber}>
                <small>R{entry.roundNumber.padStart(3, "0")}</small>
                <strong>{resultLabel(entry)}</strong>
                <span>{entry.holdPercent === null ? "RESULT HIDDEN" : `${Math.round(entry.holdPercent)} / ${Math.round(entry.jeetPercent ?? 0)}`}</span>
              </article>
            ))}
          </div>

          <div className="roulette-history-details">
            <article>
              <span>LAST RESULT</span>
              <strong>{lastSettled ? resultLabel(lastSettled) : "LIVE"}</strong>
              <p>{lastSettled ? resultDetail(lastSettled) : "The current spin is still resolving."}</p>
            </article>
            <article>
              <span>LAST POOL</span>
              <strong>{lastSettled ? `${lamportsToSol(lastSettled.potLamports)} SOL` : "—"}</strong>
              <p>{lastSettled?.result === "HOLD" ? `${lamportsToSol(lastSettled.rolloverLamports)} SOL rolled` : lastSettled?.result === "JEET" ? `${lamportsToSol(lastSettled.paidLamports)} SOL paid` : "Appears after the reveal."}</p>
            </article>
            <article>
              <span>BOARD STATE</span>
              <strong>{rounds[0]?.result === "LIVE" ? "SPINNING" : "READY"}</strong>
              <p>{rounds[0]?.result === "LIVE" ? "Current bingo draw is live." : "Next result prints after settlement."}</p>
            </article>
          </div>
        </>
      ) : (
        <div className="roulette-history-empty">
          <strong>{loaded ? "DRAW HISTORY STARTS AFTER THE FIRST REVEAL." : "BOARD SYNCING."}</strong>
          <span>No fake draws. The board fills with real settled rounds.</span>
        </div>
      )}
    </section>
  );
}
