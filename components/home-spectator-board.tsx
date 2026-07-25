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
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await protocolRequest<ProtocolStatus>("/api/status");
      setStatus(next);
      if (next.round?.roundNumber) {
        setSignal(await protocolRequest<AudienceSignal>(`/api/audience-signal/${next.round.roundNumber}`));
      }
    } catch {
      // The public board stays calm while the live feed reconnects.
    } finally {
      setLoaded(true);
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
  const displayCountdown = roundActive ? formatClock(remaining) : nextRoundCountdown ? formatClock(nextRoundCountdown) : loaded ? "WAITING" : "LOADING...";
  const episodeLabel = status?.currentRound ? `DRAW ${Number(status.currentRound)}` : loaded ? "NO LIVE DRAW" : "LOADING...";
  const pot = status?.boxWalletBalanceLamports ?? round?.potLamports ?? status?.availablePoolLamports;

  return (
    <section className="spectator-board home-spectator-board" aria-label="Live spectator dashboard">
      <header>
        <span>LIVE BINGO / SPECTATOR BOARD</span>
        <h2>{roundActive ? "THE DRAW IS LIVE." : "NEXT DRAW LOADING."}</h2>
        <p>Watch the board fill. Every eligible wallet becomes a card in the live draw.</p>
      </header>
      <div className="spectator-grid">
        <article className="spectator-countdown-card">
          <span>CURRENT DRAW</span>
          <strong>{episodeLabel}</strong>
          <small>{roundActive ? "DRAW REVEALS IN" : "NEXT DRAW IN"}</small>
          <b>{displayCountdown}</b>
        </article>
        <article className="spectator-audience-card">
          <span>{revealing ? "REVEALING WINNING CARD..." : finalSignal ? "FINAL DRAW RESULT" : signalLocked ? "FINAL MINUTE — BOARD LOCKED" : heavyObfuscation ? "FINAL FOUR — BOARD OBFUSCATED" : roundActive ? "BOARD SIGNAL — LIVE, NOT FINAL" : "BINGO BOARD FORMING"}</span>
          {revealing ? <strong>THE REVEAL IS UNDERWAY</strong> : finalSignal ? <><div className="spectator-signal"><i style={{ width: `${finalHoldPercent}%` }} /><b style={{ width: `${100 - finalHoldPercent}%` }} /></div><p><b>CARDS {finalHoldPercent}%</b><b>POOL {100 - finalHoldPercent}%</b></p></> : signalLocked ? <div className="spectator-blackout"><strong>{formatClock(remaining)}</strong><small>The winning card is hidden until reveal.</small></div> : heavyObfuscation ? <><div className="spectator-signal is-heavy-obfuscated"><i style={{ width: `${heavyHold}%` }} /><b style={{ width: `${100 - heavyHold}%` }} /></div><p><b>CARDS ???</b><b>POOL ???</b></p><small>The board is nearly unreadable.</small></> : showSignal ? <><div className="spectator-signal"><i style={{ width: `${signal.hodl}%` }} /><b style={{ width: `${signal.noHodl}%` }} /></div><p><b>CARDS {signal.hodl}%</b><b>POOL {signal.noHodl}%</b></p></> : <strong>{displayCountdown}</strong>}
          <dl><div><dt>ACTIVE CARDS</dt><dd>{status?.activeHolders != null ? status.activeHolders.toLocaleString() : loaded ? "UNAVAILABLE" : "LOADING..."}</dd></div><div><dt>TOP STREAK</dt><dd>{status?.longestStreakDays != null ? `${status.longestStreakDays} DAYS` : loaded ? "UNAVAILABLE" : "LOADING..."}</dd></div></dl>
        </article>
        <article className="spectator-box-card">
          <span>LIVE BINGO POOL</span>
          <div className="spectator-mini-box" aria-hidden="true">$</div>
          <strong>{pot == null ? loaded ? "UNAVAILABLE" : "LOADING..." : Number(pot) > 0 ? `${lamportsToSol(pot)} SOL` : "POOL FORMING"}</strong>
          <small>$DILEMMA · CREATOR FEES</small>
          {status?.potRolloverCount ? <div><span>ROLLOVER</span><b>{status.potRolloverCount}X</b></div> : null}
        </article>
      </div>
    </section>
  );
}
