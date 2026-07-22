"use client";

import { useCallback, useEffect, useState } from "react";
import { lamportsToSol, protocolRequest, type ProtocolStatus } from "@/lib/protocol-api";

const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export function HomeSpectatorBoard() {
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const next = await protocolRequest<ProtocolStatus>("/api/status");
      setStatus(next);
    } catch {
      // The public board stays calm while the Banker reconnects.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const dataTimer = window.setInterval(() => void refresh(), 15_000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => { window.clearTimeout(initial); window.clearInterval(dataTimer); window.clearInterval(clockTimer); };
  }, [refresh]);

  const round = status?.round;
  const remaining = round?.closesAt ? Math.max(0, Math.floor((new Date(round.closesAt).getTime() - now) / 1_000)) : 0;
  const decisionOpen = Boolean(status?.roundActive && remaining > 0);
  const finalMinute = decisionOpen && remaining <= 60;
  const revealing = Boolean(status?.roundActive && round?.closesAt && remaining === 0);
  const finalHodl = round?.cooperatePercent;
  const settledAge = round?.settledAt ? now - new Date(round.settledAt).getTime() : Number.POSITIVE_INFINITY;
  const finalSignal = !status?.roundActive && settledAge >= 0 && settledAge < 30_000 && round?.status !== "open" && finalHodl !== null && finalHodl !== undefined;
  const countdown = remaining;
  const nextCallCountdown = !status?.roundActive && status?.nextRoundAt ? Math.max(0, Math.floor((new Date(status.nextRoundAt).getTime() - now) / 1_000)) : 0;
  const box = status?.boxWalletBalanceLamports ?? round?.potLamports ?? status?.availablePoolLamports ?? "0";
  const banker = status?.bankerWalletBalanceLamports ?? "0";

  return (
    <section className="spectator-board home-spectator-board" aria-label="Live spectator dashboard">
      <header><span>LIVE EPISODE / SPECTATOR BOARD</span><h2>{finalMinute ? "FINAL MINUTE." : decisionOpen ? "THE BANKER IS CALLING." : "WAITING FOR THE BANKER."}</h2><p>All votes are private and reveal only when the round ends.</p></header>
      <div className="spectator-grid">
        <article><span>CURRENT EPISODE</span><strong>{status?.currentRound ? String(status.currentRound).padStart(3, "0") : "AWAITING FIRST EPISODE"}</strong><small>{status?.roundActive ? `${finalMinute ? "FINAL COUNTDOWN" : "THE BOX OPENS IN"} ${formatClock(countdown)}` : nextCallCountdown ? `NEXT 15-MINUTE CALL ${formatClock(nextCallCountdown)}` : "WAITING FOR A FUNDED BOX"}</small></article>
        <article className="spectator-audience-card">
          <span>{revealing ? "REVEALING FINAL DECISIONS..." : finalSignal ? "FINAL WEIGHTED RESULT" : finalMinute ? "FINAL 60 SECONDS" : decisionOpen ? "PRIVATE DECISIONS OPEN" : "WAITING FOR THE BANKER"}</span>
          {revealing ? <strong>THE REVEAL IS UNDERWAY</strong> : finalSignal ? <><div className="spectator-signal"><i style={{ width: `${finalHodl}%` }} /><b style={{ width: `${100 - finalHodl}%` }} /></div><p><b>HODL {finalHodl}%</b><b>NO HODL {100 - finalHodl}%</b></p></> : finalMinute ? <><strong>{formatClock(remaining)}</strong><small>Last minute. Every vote stays hidden until the reveal.</small></> : decisionOpen ? <><strong>VOTES ARE PRIVATE</strong><small>Players can choose HODL or NO HODL. Nothing public reveals until the round ends.</small></> : <strong>AWAITING THE NEXT CALL</strong>}
          <dl><div><dt>ACTIVE HOLDERS</dt><dd>{status?.activeHolders ? status.activeHolders.toLocaleString() : "AWAITING PLAYERS"}</dd></div><div><dt>LONGEST STREAK</dt><dd>{status?.longestStreakDays ? `${status.longestStreakDays} DAYS` : "FIRST STREAK FORMING"}</dd></div></dl>
        </article>
        <article className="spectator-box-card"><span>LIVE TREASURY</span><div className="spectator-mini-box" aria-hidden="true">?</div><strong>{Number(box) > 0 ? `${lamportsToSol(box)} SOL` : "AWAITING FUNDED BOX"}</strong><small>THE BOX · 80% OF CREATOR FEES</small><div><span>BANKER RESERVE · 20%</span><b>{Number(banker) > 0 ? `${lamportsToSol(banker)} SOL` : "AWAITING FEES"}</b></div></article>
      </div>
    </section>
  );
}
