"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  baseUnitsToTokenAmount,
  lamportsToSol,
  protocolApiUrl,
  protocolRequest,
  type HolderState,
  type ProtocolStatus,
} from "@/lib/protocol-api";
import { SIMULATION_COUNTDOWN_SECONDS, simulationStatus } from "@/lib/protocol-simulation";

const tierNames = ["Paper Hands", "Iron Hands", "Diamond Hands", "Obsidian Hands"];
const base64FromBytes = (value: Uint8Array) => {
  let binary = "";
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
};
const hexFromBytes = (value: Uint8Array) => Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
const sha256Hex = async (value: string) => hexFromBytes(new Uint8Array(await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
const remainingSeconds = (iso?: string | null) => iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 0;
const formatCountdown = (seconds: number) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
};

type GameResponse = { ok?: boolean; message?: string; signature?: string; amountLamports?: string };
type AudienceSignal = { hodl: number; noHodl: number; sampleSize: number; label: string };
type SealedChoice = "cooperate" | "defect";

const hasPositiveLamports = (value?: string) => {
  try {
    return BigInt(value ?? "0") > 0n;
  } catch {
    return false;
  }
};

export function ProtocolConsole() {
  const { connected, wallet } = useWalletConnection();
  const address = wallet?.account.address.toString();
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [holder, setHolder] = useState<HolderState | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [countdown, setCountdown] = useState(SIMULATION_COUNTDOWN_SECONDS);
  const [simulationMode, setSimulationMode] = useState(!protocolApiUrl);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sealedChoice, setSealedChoice] = useState<SealedChoice | null>(null);
  const [audienceSignal, setAudienceSignal] = useState<AudienceSignal | null>(null);

  const refresh = useCallback(async (authToken = sessionToken) => {
    if (!protocolApiUrl) {
      setSimulationMode(true);
      return;
    }
    const nextStatus = await protocolRequest<ProtocolStatus>("/api/status");
    if (!nextStatus.configured) {
      setSimulationMode(true);
      setStatus(null);
      setHolder(null);
      setCountdown((current) => current || SIMULATION_COUNTDOWN_SECONDS);
      return;
    }
    setSimulationMode(false);
    setStatus(nextStatus);
    const target = nextStatus.roundActive ? nextStatus.round?.closesAt : nextStatus.nextRoundAt;
    setCountdown(remainingSeconds(target));
    if (nextStatus.round?.roundNumber) {
      setAudienceSignal(await protocolRequest<AudienceSignal>(`/api/audience-signal/${nextStatus.round.roundNumber}`));
    }
    if (address && authToken) {
      const nextHolder = await protocolRequest<HolderState>(`/api/holder/${address}`, undefined, authToken);
      setHolder(nextHolder);
      setSealedChoice(nextHolder.participationStatus === "HODL" ? "cooperate" : nextHolder.participationStatus === "NO HODL" ? "defect" : null);
    }
  }, [address, sessionToken]);

  useEffect(() => {
    if (!protocolApiUrl) return;
    const initial = window.setTimeout(() => {
      void refresh().catch((refreshError) => {
        console.error("Protocol status refresh failed", refreshError);
        setSimulationMode(true);
        setStatus(null);
      });
    }, 0);
    const interval = window.setInterval(() => void refresh().catch((refreshError) => {
      console.error("Protocol status refresh failed", refreshError);
      setSimulationMode(true);
      setStatus(null);
    }), 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    queueMicrotask(async () => {
      setHolder(null);
      setSealedChoice(null);
      setMessage("");
      setError("");
      if (!address || !protocolApiUrl) {
        setSessionToken("");
        return;
      }
      const stored = window.sessionStorage.getItem(`hodl-session:${address}`) ?? "";
      if (!stored) {
        setSessionToken("");
        return;
      }
      try {
        await protocolRequest<{ ok: true; wallet: string }>("/api/auth/session", undefined, stored);
        setSessionToken(stored);
      } catch {
        window.sessionStorage.removeItem(`hodl-session:${address}`);
        setSessionToken("");
      }
    });
  }, [address]);

  const signIn = useCallback(async () => {
    if (!wallet || !address) throw new Error("Connect a Solana wallet first.");
    if (!wallet.signMessage) throw new Error("This wallet does not support message signing.");
    setBusy("signin");
    setError("");
    try {
      const challenge = await protocolRequest<{ message: string }>(`/api/auth/challenge?wallet=${encodeURIComponent(address)}`);
      const signature = await wallet.signMessage(new TextEncoder().encode(challenge.message));
      const verified = await protocolRequest<{ token: string }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ wallet: address, message: challenge.message, signature: base64FromBytes(signature) }),
      });
      setSessionToken(verified.token);
      window.sessionStorage.setItem(`hodl-session:${address}`, verified.token);
      setMessage("Wallet verified. Claim your seat, then wait for the Banker's call.");
      return verified.token;
    } finally {
      setBusy("");
    }
  }, [address, wallet]);

  const sendGameAction = useCallback(async (path: string, body: Record<string, string>, label: string) => {
    if (!wallet || !address) throw new Error("Connect a Solana wallet first.");
    setBusy(label);
    setError("");
    setMessage("");
    try {
      const token = sessionToken || await signIn();
      const response = await protocolRequest<GameResponse>(path, {
        method: "POST",
        body: JSON.stringify({ wallet: address, ...body }),
      }, token);
      const suffix = response.signature ? ` ${response.signature}` : "";
      setMessage(response.message ? `${response.message}${suffix}` : `${label} submitted.${suffix}`);
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      await refresh(token);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `${label} failed.`);
    } finally {
      setBusy("");
    }
  }, [address, refresh, sessionToken, signIn, wallet]);

  const activeRoundNumber = status?.round?.roundNumber;

  const submitSealedDecision = useCallback(async (choice: SealedChoice) => {
    if (!wallet || !address || !activeRoundNumber) throw new Error("Connect and enter the live episode first.");
    if (sealedChoice && sealedChoice !== choice && !window.confirm("UNSEAL AND CHANGE? Your previous commitment will be superseded.")) return;
    setBusy(choice);
    setError("");
    setMessage("");
    try {
      const token = sessionToken || await signIn();
      const salt = hexFromBytes(window.crypto.getRandomValues(new Uint8Array(32)));
      const roundNumber = activeRoundNumber;
      const commitment = await sha256Hex(`${choice}${salt}${address}${roundNumber}`);
      await protocolRequest<GameResponse>("/api/vote/commit", {
        method: "POST",
        body: JSON.stringify({ wallet: address, roundNumber, choice, salt, commitment }),
      }, token);
      setSealedChoice(choice);
      setMessage("DECISION SEALED — WAITING FOR THE REVEAL.");
      await refresh(token);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The decision could not be sealed.");
    } finally {
      setBusy("");
    }
  }, [activeRoundNumber, address, refresh, sealedChoice, sessionToken, signIn, wallet]);

  const sendAudienceSignal = useCallback(async (choice: SealedChoice) => {
    const roundNumber = activeRoundNumber;
    if (!roundNumber) return;
    let signalId = window.localStorage.getItem("hodl-audience-signal-id");
    if (!signalId) {
      signalId = window.crypto.randomUUID();
      window.localStorage.setItem("hodl-audience-signal-id", signalId);
    }
    await protocolRequest("/api/audience-signal", {
      method: "POST",
      body: JSON.stringify({ roundNumber, choice, signalId }),
    });
    setAudienceSignal(await protocolRequest<AudienceSignal>(`/api/audience-signal/${roundNumber}`));
  }, [activeRoundNumber]);

  const displayStatus = simulationMode ? simulationStatus : status;
  const decimals = displayStatus?.tokenDecimals ?? 6;
  const positionAmount = holder?.position ? baseUnitsToTokenAmount(holder.position.amount, decimals) : "0";
  const round = displayStatus?.round;
  const hasPosition = Boolean(holder?.position && BigInt(holder.position.amount) > 0n);
  const decisionWindowOpen = Boolean(status?.roundActive && round?.status === "open" && countdown > 0 && countdown <= 3_600);
  const canVote = Boolean(connected && sessionToken && hasPosition && decisionWindowOpen && !holder?.soldThisRound);
  const protocolReady = Boolean(!simulationMode && protocolApiUrl && status?.configured);
  const hasLiveRound = Boolean(displayStatus?.roundActive && round);
  const currentPot = round?.potLamports ?? displayStatus?.availablePoolLamports;
  const hasFundedPot = hasPositiveLamports(currentPot);
  const inFinalMinute = countdown > 0 && countdown <= 60 && Boolean(displayStatus?.roundActive);
  const countdownText = countdown > 0 ? formatCountdown(countdown) : "AWAITING CALL";
  const headline = useMemo(() => {
    if (simulationMode) return "THE BOX IS FILLING.";
    if (displayStatus?.roundActive) return "THE OFFER IS LIVE.";
    if (hasFundedPot) return "OFFER INCOMING.";
    return "WAITING FOR THE BANKER'S CALL.";
  }, [displayStatus?.roundActive, hasFundedPot, simulationMode]);
  const projectedShare = holder?.projectedShareLamports && hasPositiveLamports(holder.projectedShareLamports)
    ? `${lamportsToSol(holder.projectedShareLamports)} SOL`
    : "WAITING FOR LIVE POT";

  return (
    <section className={`protocol-console section-shell ${inFinalMinute ? "final-minute" : ""} ${holder?.soldThisRound ? "player-out" : ""}`} id="play" aria-labelledby="protocol-console-title">
      <div className="protocol-console-head">
        <div>
          <div className="broadcast-status-row" aria-label="Broadcast status">
            <span><i /> LIVE</span>
            <span>BANKER ONLINE</span>
            <span>{hasLiveRound ? `ROUND ${displayStatus?.currentRound}` : "BANKER ONLINE"}</span>
            <span>{inFinalMinute ? "BANKER PREPARING OFFER" : hasLiveRound ? "DECISION PENDING" : "NEXT OFFER PENDING"}</span>
            {simulationMode ? <span className="simulation-tag">SIMULATION</span> : null}
          </div>
          <span>THE BANKER&apos;S ROOM / LIVE SOLANA GAME</span>
          <h2 id="protocol-console-title">{headline}</h2>
        </div>
        <div className="protocol-countdown">
          <span>{inFinalMinute ? "BANKER PREPARING OFFER" : hasLiveRound ? "BANKER CLOSES CASE IN" : "NEXT CALL"}</span>
          <strong>{countdownText}</strong>
        </div>
      </div>

      {hasLiveRound || hasFundedPot ? (
        <>
        {displayStatus?.potRolloverCount ? <div className="rollover-badge">POT HAS ROLLED {displayStatus.potRolloverCount}X</div> : null}
        <div className="protocol-stats">
          <div><span>ROUND</span><strong>{hasLiveRound ? displayStatus?.currentRound : "Offer incoming"}</strong></div>
          <div><span>CURRENT POT</span><strong>{hasFundedPot ? `${lamportsToSol(currentPot)} SOL` : "Awaiting funded pot"}</strong></div>
          <div><span>AUDIENCE SIGNAL</span><strong>{simulationMode ? "62% HODL / 38% NO HODL" : audienceSignal ? `${audienceSignal.hodl}% HODL / ${audienceSignal.noHodl}% NO HODL` : "ESTIMATED SENTIMENT PENDING"}</strong><small>ESTIMATED SENTIMENT — NOT FINAL VOTES</small></div>
          <div className="projected-share-stat"><span>PROJECTED SHARE</span><strong>{simulationMode ? "DEMO" : projectedShare}</strong></div>
          <div><span>CONTESTANTS</span><strong>{displayStatus?.activeHolders ? displayStatus.activeHolders.toLocaleString() : "Waiting for holders"}</strong></div>
          <div><span>YOUR SEAT</span><strong>{simulationMode ? "DEMO BOX" : holder ? `${baseUnitsToTokenAmount(holder.walletTokenBalance, decimals)} / ${positionAmount}` : connected ? "Claim seat" : "Connect wallet"}</strong></div>
        </div>
        </>
      ) : (
        <div className="protocol-waiting-card" role="status" aria-live="polite">
          <span>BANKER ONLINE</span>
          <strong>Waiting for the Banker&apos;s call.</strong>
          <p>{countdown > 0 ? `Next call in ${formatCountdown(countdown)}.` : "The next offer is pending."}</p>
        </div>
      )}

      <div className="protocol-wallet-row">
        <div><span>WALLET ACCESS</span><strong>{address ? `${address.slice(0, 5)}…${address.slice(-5)}` : "NOT CONNECTED"}</strong><small>{simulationMode ? "SIMULATION / NO TRANSACTIONS" : sessionToken ? "SIGNED IN / GAME ENABLED" : connected ? "SIGN IN TO PLAY" : "CONNECT ABOVE TO CONTINUE"}</small></div>
        {connected && !sessionToken && !simulationMode ? <button type="button" disabled={Boolean(busy)} onClick={() => void signIn().catch((signInError) => setError(signInError instanceof Error ? signInError.message : "Sign-in failed."))}>{busy === "signin" ? "SIGNING…" : "SIGN IN"}</button> : null}
      </div>

      {holder?.soldThisRound ? (
        <div className="player-out-state" role="alert"><span>YOU&apos;RE OUT</span><strong>SELLING IS NO HODL.</strong><p>You can still watch the reveal, but this round&apos;s payout and streak are gone.</p></div>
      ) : holder?.position ? (
        <div className="your-box-panel" aria-live="polite">
          <div><span>SNAPSHOT BALANCE</span><strong>{baseUnitsToTokenAmount(holder.snapshotBalance, decimals)}</strong></div>
          <div><span>CURRENT STREAK</span><strong>{Math.floor(Number(holder.position.streakSeconds) / 3_600)} HOURS</strong></div>
          <div><span>MULTIPLIER</span><strong>{(holder.multiplierBps / 10_000).toFixed(1)}×</strong></div>
          <div className="your-box-projection"><span>PROJECTED SHARE IF YOU HODL</span><strong>{projectedShare}</strong></div>
          <div><span>PARTICIPATION</span><strong>{holder.participationStatus}</strong></div>
        </div>
      ) : null}

      {protocolApiUrl && status && !status.configured && connected && sessionToken ? (
        <div className="protocol-actions">
          <button type="button" disabled={Boolean(busy)} onClick={() => void sendGameAction("/api/tx/initialize", {}, "FIRST OFFER")}>ARM FIRST OFFER</button>
        </div>
      ) : null}

      {protocolReady && connected && sessionToken ? (
        <div className="protocol-actions">
          {!holder?.position ? <button type="button" disabled={Boolean(busy)} onClick={() => void sendGameAction("/api/tx/open-position", {}, "SEAT CLAIM")}>CLAIM YOUR SEAT</button> : (
            <>
              <button type="button" disabled={Boolean(busy)} onClick={() => void sendGameAction("/api/tx/deposit", {}, "SEAT REFRESH")}>REFRESH SEAT</button>
              <button className="cooperate-action" type="button" disabled={Boolean(busy) || !canVote} aria-pressed={sealedChoice === "cooperate"} onClick={() => void submitSealedDecision("cooperate")}>HODL</button>
              <button className="defect-action" type="button" disabled={Boolean(busy) || !canVote} aria-pressed={sealedChoice === "defect"} onClick={() => void submitSealedDecision("defect")}>NO HODL</button>
            </>
          )}
        </div>
      ) : null}

      {protocolReady && round?.status === "open" ? (
        <div className="audience-poll" aria-label="Audience signal poll">
          <span>AUDIENCE SIGNAL — ESTIMATED SENTIMENT — NOT FINAL VOTES</span>
          <button type="button" onClick={() => void sendAudienceSignal("cooperate")}>SIGNAL HODL</button>
          <button type="button" onClick={() => void sendAudienceSignal("defect")}>SIGNAL NO HODL</button>
        </div>
      ) : null}

      {holder?.position && !decisionWindowOpen && round?.status === "open" ? <p className="decision-locked">CHOICES UNLOCK IN {formatCountdown(Math.max(0, countdown - 3_600))}</p> : null}
      {sealedChoice ? <p className="decision-sealed">DECISION SEALED — WAITING FOR THE REVEAL. {decisionWindowOpen ? "UNSEAL AND CHANGE? Choose again above." : ""}</p> : null}

      {holder?.position ? <div className="protocol-position-line"><span>TIER <b>{tierNames[holder.position.tier] ?? holder.position.tierName}</b></span><span>STREAK <b>{Math.floor(Number(holder.position.streakSeconds) / 86_400)} DAYS</b></span><span>HELD <b>{positionAmount}</b></span></div> : null}
      {message ? <p className="protocol-success" role="status">{message}</p> : null}
      {error && !simulationMode ? <p className="protocol-error" role="alert">{error}</p> : null}
      <p className="protocol-console-foot">Connect wallet → sign in → view your box → wait for the Banker&apos;s call → choose HODL or NO HODL.</p>
    </section>
  );
}
