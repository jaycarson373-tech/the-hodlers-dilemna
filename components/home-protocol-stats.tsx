"use client";

import { useCallback, useEffect, useState } from "react";
import { lamportsToSol, protocolRequest, type ProtocolStats } from "@/lib/protocol-api";

export function HomeProtocolStats() {
  const [stats, setStats] = useState<ProtocolStats | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStats(await protocolRequest<ProtocolStats>("/api/bingo/stats"));
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  if (!stats) return null;

  return (
    <section className="home-protocol-stats" aria-label="Live protocol totals">
      <article>
        <span>JACKPOT BALANCE</span>
        <strong>{lamportsToSol(stats.jackpotBalanceLamports)} SOL</strong>
      </article>
      <article>
        <span>ROUNDS COMPLETED</span>
        <strong>{stats.completedRounds.toLocaleString()}</strong>
      </article>
      <article>
        <span>TOTAL PAID</span>
        <strong>{lamportsToSol(stats.totalPaidLamports)} SOL</strong>
      </article>
    </section>
  );
}
