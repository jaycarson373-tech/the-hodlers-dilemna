"use client";

import { useCallback, useEffect, useState } from "react";
import { lamportsToSol, protocolRequest, type ProtocolStatus } from "@/lib/protocol-api";

type AudienceSignal = {
  hodl: number | null;
  noHodl: number | null;
  sampleSize?: number;
  phase?: "waiting" | "live" | "soft" | "heavy" | "locked" | "revealing" | "final";
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
      // The public board stays calm while the live feed reconnects.
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
  const roundActive = Boolean(status?.roundActive && remaining > 0);
  const heavyObfuscation = Boolean(roundActive && remaining <= 300 && remaining > 60);
  const signalLocked = Boolean(roundActive && remaining <= 60 && remaining > 0);
  const revealing = Boolean(status?.roundActive && round?.closesAt && remaining === 0);
  const finalHold = round?.cooperatePercent;
  const finalHoldPercent = finalHold ?? 0;
  const settledAge = round?.settledAt ? now - new Date(round.settledAt).getTime() : Number.POSITIVE_INFINITY;
  const finalSignal = !status?.roundActive && settledAge >= 0 && settledAge < 30_000 && round?.status !== "open" && finalHold !== null && finalHold !== undefined;
  const showSignal = roundActive && !heavyObfuscation && !signalLocked && signal.hodl !== null && signal.noHodl !== null;
  const heavyDrift = Math.round(Math.sin(now / 5_500) * 4);
  const heavyHold = 50 + heavyDrift;
  const nextRoundCountdown = !roundActive && status?.nextRoundAt ? Math.max(0, Math.floor((new Date(status.nextRoundAt).getTime() - now) / 1_000)) : 0;
  const displayCountdown = roundActive ? formatClock(remaining) : nextRoundCountdown ? formatClock(nextRoundCountdown) : "15:00";
  const episodeLabel = status?.currentRound ? `ROUND ${Number(status.currentRound)}` : "ROUND 1";
  const pot = status?.boxWalletBalanceLamports ?? round?.potLamports ?? status?.availablePoolLamports ?? "0";

  return (
    <section className="spectator-board home-spectator-board" aria-label="Live spectator dashboard">
      <header>
        <span>LIVE ROUND / SPECTATOR BOARD</span>
        <h2>{roundActive ? "THE DILEMMA IS LIVE." : "NEXT DILEMMA LOADING."}</h2>
        <p>Watch the signal. The closer it gets to zero, the harder the room becomes to read.</p>
      </header>
      <div className="spectator-grid">
        <article className="spectator-countdown-card">
          <span>CURRENT ROUND</span>
          <strong>{episodeLabel}</strong>
          <small>{roundActive ? "ROUND ENDS IN" : "NEXT ROUND IN"}</small>
          <b>{displayCountdown}</b>
        </article>
        <article className="spectator-audience-card">
          <span>{revealing ? "REVEALING FINAL DECISIONS..." : finalSignal ? "FINAL WEIGHTED RESULT" : signalLocked ? "FINAL MINUTE — SIGNAL LOCKED" : heavyObfuscation ? "FINAL FOUR — SIGNAL HEAVILY OBFUSCATED" : roundActive ? "AUDIENCE SIGNAL — LIVE, NOT FINAL" : "DILEMMA SIGNAL FORMING"}</span>
          {revealing ? <strong>THE REVEAL IS UNDERWAY</strong> : finalSignal ? <><div className="spectator-signal"><i style={{ width: `${finalHoldPercent}%` }} /><b style={{ width: `${100 - finalHoldPercent}%` }} /></div><p><b>HOLD {finalHoldPercent}%</b><b>JEET {100 - finalHoldPercent}%</b></p></> : signalLocked ? <div className="spectator-blackout"><strong>{formatClock(remaining)}</strong><small>Final decisions are hidden until the reveal.</small></div> : heavyObfuscation ? <><div className="spectator-signal is-heavy-obfuscated"><i style={{ width: `${heavyHold}%` }} /><b style={{ width: `${100 - heavyHold}%` }} /></div><p><b>HOLD ???</b><b>JEET ???</b></p><small>The room is nearly unreadable.</small></> : showSignal ? <><div className="spectator-signal"><i style={{ width: `${signal.hodl}%` }} /><b style={{ width: `${signal.noHodl}%` }} /></div><p><b>HOLD {signal.hodl}%</b><b>JEET {signal.noHodl}%</b></p></> : <strong>{displayCountdown}</strong>}
          <dl><div><dt>ACTIVE HOLDERS</dt><dd>{status?.activeHolders ? status.activeHolders.toLocaleString() : "BOARD FORMING"}</dd></div><div><dt>LONGEST STREAK</dt><dd>{status?.longestStreakDays ? `${status.longestStreakDays} DAYS` : "ROUND 1"}</dd></div></dl>
        </article>
        <article className="spectator-box-card">
          <span>LIVE FEE POT</span>
          <div className="spectator-mini-box" aria-hidden="true">$</div>
          <strong>{Number(pot) > 0 ? `${lamportsToSol(pot)} SOL` : "POT FORMING"}</strong>
          <small>$DILEMMA · CREATOR FEES</small>
          {status?.potRolloverCount ? <div><span>ROLLOVER</span><b>{status.potRolloverCount}X</b></div> : null}
        </article>
      </div>
    </section>
  );
}
