"use client";

import { useCallback, useEffect, useState } from "react";
import { lamportsToSol, protocolRequest, type ProtocolStatus } from "@/lib/protocol-api";

type AudienceSignal = {
  hodl: number | null;
  noHodl: number | null;
  sampleSize?: number;
  phase?: "waiting" | "live" | "locked" | "revealing" | "final";
};

const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export function HomeSpectatorBoard() {
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [signal, setSignal] = useState<AudienceSignal>({ hodl: null, noHodl: null, phase: "waiting" });
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const next = await protocolRequest<ProtocolStatus>("/api/status");
      setStatus(next);
      if (next.round?.roundNumber) {
        setSignal(await protocolRequest<AudienceSignal>(`/api/audience-signal/${next.round.roundNumber}`));
      }
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
  const decisionWindow = Number(status?.decisionWindowSeconds ?? 300);
  const decisionOpen = Boolean(status?.roundActive && remaining > 0 && remaining <= decisionWindow);
  const signalLocked = decisionOpen && remaining <= 60;
  const revealing = Boolean(status?.roundActive && round?.closesAt && remaining === 0);
  const finalHodl = round?.cooperatePercent;
  const settledAge = round?.settledAt ? now - new Date(round.settledAt).getTime() : Number.POSITIVE_INFINITY;
  const finalSignal = !status?.roundActive && settledAge >= 0 && settledAge < 30_000 && round?.status !== "open" && finalHodl !== null && finalHodl !== undefined;
  const showSignal = decisionOpen && signal.hodl !== null && signal.noHodl !== null;
  const countdown = decisionOpen ? remaining : Math.max(0, remaining - decisionWindow);
  const nextCallCountdown = !status?.roundActive && status?.nextRoundAt ? Math.max(0, Math.floor((new Date(status.nextRoundAt).getTime() - now) / 1_000)) : 0;
  const box = status?.boxWalletBalanceLamports ?? round?.potLamports ?? status?.availablePoolLamports ?? "0";
  const banker = status?.bankerWalletBalanceLamports ?? "0";

  return (
    <section className="spectator-board home-spectator-board" aria-label="Live spectator dashboard">
      <header><span>LIVE EPISODE / SPECTATOR BOARD</span><h2>{decisionOpen ? "DECISION WINDOW OPEN." : status?.roundActive ? "THE BOX IS GROWING." : "WAITING FOR THE BANKER."}</h2><p>Watch the episode live. Connect only when you are ready to enter.</p></header>
      <div className="spectator-grid">
        <article><span>CURRENT EPISODE</span><strong>{status?.currentRound ? String(status.currentRound).padStart(3, "0") : "AWAITING FIRST EPISODE"}</strong><small>{status?.roundActive ? `${decisionOpen ? "DECISIONS LOCK IN" : "BANKER CALLS IN"} ${formatClock(countdown)}` : nextCallCountdown ? `NEXT 15-MINUTE CALL ${formatClock(nextCallCountdown)}` : "WAITING FOR A FUNDED BOX"}</small></article>
        <article className="spectator-audience-card">
          <span>{revealing ? "REVEALING FINAL DECISIONS..." : finalSignal ? "FINAL WEIGHTED RESULT" : signalLocked ? "FINAL MINUTE — SIGNAL LOCKED" : decisionOpen ? "AUDIENCE SIGNAL — LIVE, NOT FINAL" : "WAITING FOR THE BANKER"}</span>
          {revealing ? <strong>THE REVEAL IS UNDERWAY</strong> : finalSignal ? <><div className="spectator-signal"><i style={{ width: `${finalHodl}%` }} /><b style={{ width: `${100 - finalHodl}%` }} /></div><p><b>HODL {finalHodl}%</b><b>NO HODL {100 - finalHodl}%</b></p></> : showSignal ? <><div className="spectator-signal"><i style={{ width: `${signal.hodl}%` }} /><b style={{ width: `${signal.noHodl}%` }} /></div><p><b>HODL {signal.hodl}%</b><b>NO HODL {signal.noHodl}%</b></p>{signalLocked ? <small>Players may still change their decision. Final choices remain hidden until the reveal.</small> : null}</> : <strong>{decisionOpen ? "AUDIENCE FORMING" : "THE SIGNAL APPEARS WHEN THE OFFER OPENS"}</strong>}
          <dl><div><dt>ACTIVE HOLDERS</dt><dd>{status?.activeHolders ? status.activeHolders.toLocaleString() : "AWAITING PLAYERS"}</dd></div><div><dt>LONGEST STREAK</dt><dd>{status?.longestStreakDays ? `${status.longestStreakDays} DAYS` : "FIRST STREAK FORMING"}</dd></div></dl>
        </article>
        <article className="spectator-box-card"><span>LIVE TREASURY</span><div className="spectator-mini-box" aria-hidden="true">?</div><strong>{Number(box) > 0 ? `${lamportsToSol(box)} SOL` : "AWAITING FUNDED BOX"}</strong><small>THE BOX · 80% OF CREATOR FEES</small><div><span>BANKER RESERVE · 20%</span><b>{Number(banker) > 0 ? `${lamportsToSol(banker)} SOL` : "AWAITING FEES"}</b></div></article>
      </div>
    </section>
  );
}
