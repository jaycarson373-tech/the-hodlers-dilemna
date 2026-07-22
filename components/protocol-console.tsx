"use client";

import { createClient } from "@supabase/supabase-js";
import { useWalletConnection } from "@solana/react-hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBankerFeed } from "@/components/use-banker-feed";
import { usePublicLeaderboard } from "@/components/use-public-leaderboard";
import {
  baseUnitsToTokenAmount,
  lamportsToSol,
  protocolApiUrl,
  protocolRequest,
  type HolderState,
  type ProtocolRound,
  type ProtocolStatus,
} from "@/lib/protocol-api";

type SealedChoice = "cooperate" | "defect";
type GameResponse = { ok?: boolean; message?: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
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
  return hours === "00" ? `${minutes}:${secs}` : `${hours}:${minutes}:${secs}`;
};
const positive = (value?: string) => {
  try { return BigInt(value ?? "0") > 0n; } catch { return false; }
};
const shortWallet = (value?: string) => value ? `${value.slice(0, 4)}...${value.slice(-4)}` : "NOT CONNECTED";

export function ProtocolConsole() {
  const { connected, wallet } = useWalletConnection();
  const address = wallet?.account.address.toString();
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [holder, setHolder] = useState<HolderState | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sealedChoice, setSealedChoice] = useState<SealedChoice | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revealRound, setRevealRound] = useState<ProtocolRound | null>(null);
  const previousRound = useRef<ProtocolRound | null>(null);
  const { events } = useBankerFeed(8);
  const { entries } = usePublicLeaderboard(10);

  const realtime = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }, []);

  const refresh = useCallback(async (authToken = sessionToken) => {
    if (!protocolApiUrl) return;
    const nextStatus = await protocolRequest<ProtocolStatus>("/api/status");
    setStatus(nextStatus);
    const target = nextStatus.roundActive ? nextStatus.round?.closesAt : nextStatus.nextRoundAt;
    setCountdown(remainingSeconds(target));
    if (previousRound.current?.status === "open" && nextStatus.round && nextStatus.round.status !== "open") {
      setRevealRound(nextStatus.round);
    }
    previousRound.current = nextStatus.round ?? null;
    if (address && authToken && nextStatus.configured) {
      const nextHolder = await protocolRequest<HolderState>(`/api/holder/${address}`, undefined, authToken);
      setHolder(nextHolder);
      setSealedChoice(nextHolder.participationStatus === "HODL" ? "cooperate" : nextHolder.participationStatus === "NO HODL" ? "defect" : null);
    }
  }, [address, sessionToken]);

  useEffect(() => {
    if (!protocolApiUrl) return;
    const initial = window.setTimeout(() => void refresh().catch((refreshError) => console.error("Live game refresh failed", refreshError)), 0);
    const interval = window.setInterval(() => void refresh().catch((refreshError) => console.error("Live game refresh failed", refreshError)), 10_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [refresh]);

  useEffect(() => {
    if (!realtime) return;
    const channel = realtime.channel("live-game-room")
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "protocol_config" }, () => void refresh())
      .subscribe();
    return () => { void realtime.removeChannel(channel); };
  }, [realtime, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    queueMicrotask(async () => {
      setHolder(null);
      setSealedChoice(null);
      setMessage("");
      setError("");
      if (!address || !protocolApiUrl) { setSessionToken(""); return; }
      const stored = window.sessionStorage.getItem(`hodl-session:${address}`) ?? "";
      if (!stored) { setSessionToken(""); return; }
      try {
        await protocolRequest("/api/auth/session", undefined, stored);
        setSessionToken(stored);
      } catch {
        window.sessionStorage.removeItem(`hodl-session:${address}`);
        setSessionToken("");
      }
    });
  }, [address]);

  const signIn = useCallback(async () => {
    if (!wallet || !address) throw new Error("Connect a Solana wallet first.");
    if (!wallet.signMessage) throw new Error("This wallet cannot sign the Banker's message.");
    setBusy("signin"); setError("");
    try {
      const challenge = await protocolRequest<{ message: string }>(`/api/auth/challenge?wallet=${encodeURIComponent(address)}`);
      const signature = await wallet.signMessage(new TextEncoder().encode(challenge.message));
      const verified = await protocolRequest<{ token: string }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ wallet: address, message: challenge.message, signature: base64FromBytes(signature) }),
      });
      setSessionToken(verified.token);
      window.sessionStorage.setItem(`hodl-session:${address}`, verified.token);
      setMessage("SEAT VERIFIED — YOUR BOX IS READY.");
      await refresh(verified.token);
      return verified.token;
    } finally { setBusy(""); }
  }, [address, refresh, wallet]);

  const claimSeat = useCallback(async () => {
    if (!wallet || !address) return;
    setBusy("seat"); setError("");
    try {
      const token = sessionToken || await signIn();
      const response = await protocolRequest<GameResponse>("/api/tx/open-position", { method: "POST", body: JSON.stringify({ wallet: address }) }, token);
      setMessage(response.message ?? "YOUR BOX IS ON THE BOARD.");
      await refresh(token);
    } catch (seatError) {
      setError(seatError instanceof Error ? seatError.message : "The Banker could not verify this seat.");
    } finally { setBusy(""); }
  }, [address, refresh, sessionToken, signIn, wallet]);

  const activeRoundNumber = status?.round?.roundNumber;
  const submitDecision = useCallback(async (choice: SealedChoice) => {
    if (!wallet || !address || !activeRoundNumber) return;
    if (sealedChoice && sealedChoice !== choice && !window.confirm("UNSEAL AND CHANGE? Your earlier sealed choice will be replaced.")) return;
    setBusy(choice); setError(""); setMessage("");
    try {
      const token = sessionToken || await signIn();
      const salt = hexFromBytes(window.crypto.getRandomValues(new Uint8Array(32)));
      const commitment = await sha256Hex(`${choice}${salt}${address}${activeRoundNumber}`);
      await protocolRequest("/api/vote/commit", {
        method: "POST",
        body: JSON.stringify({ wallet: address, roundNumber: activeRoundNumber, choice, salt, commitment }),
      }, token);
      setSealedChoice(choice);
      setMessage("DECISION SEALED — WAITING FOR THE REVEAL.");
      await refresh(token);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "The decision could not be sealed.");
    } finally { setBusy(""); }
  }, [activeRoundNumber, address, refresh, sealedChoice, sessionToken, signIn, wallet]);

  const decimals = status?.tokenDecimals ?? 6;
  const round = status?.round;
  const pot = status?.boxWalletBalanceLamports ?? round?.potLamports ?? status?.availablePoolLamports ?? "0";
  const bankerPot = status?.bankerWalletBalanceLamports ?? "0";
  const hasPot = positive(pot);
  const decisionWindow = Number(status?.decisionWindowSeconds ?? 300);
  const decisionOpen = Boolean(status?.roundActive && round?.status === "open" && countdown > 0 && countdown <= decisionWindow);
  const callCountdown = decisionOpen ? countdown : Math.max(0, countdown - decisionWindow);
  const finalMinute = decisionOpen && countdown <= 60;
  const hasPosition = Boolean(holder?.position && positive(holder.position.amount));
  const canChoose = Boolean(connected && sessionToken && hasPosition && decisionOpen && !holder?.soldThisRound);
  const balance = holder ? baseUnitsToTokenAmount(holder.walletTokenBalance, decimals) : "—";
  const streakSeconds = Number(holder?.position?.streakSeconds ?? 0);
  const streak = streakSeconds >= 86_400 ? `${Math.floor(streakSeconds / 86_400)} DAYS` : `${Math.floor(streakSeconds / 3_600)} HOURS`;
  const multiplier = holder ? `${(holder.multiplierBps / 10_000).toFixed(1)}×` : "—";
  const playerWeight = holder ? baseUnitsToTokenAmount(holder.playerWeight, decimals) : "—";
  const offer = positive(holder?.bankerOfferLamports) ? `${lamportsToSol(holder?.bankerOfferLamports)} SOL` : "AWAITING OFFER";
  const projected = positive(holder?.projectedShareLamports) ? `${lamportsToSol(holder?.projectedShareLamports)} SOL` : "AWAITING BOX";
  const episode = status?.currentRound ? String(status.currentRound).padStart(3, "0") : "—";
  const phase = !status?.configured ? "WAITING FOR THE BANKER" : !status.roundActive ? "AWAITING FUNDED BOX" : decisionOpen ? "THE BANKER IS CALLING" : "THE BOX IS FILLING";

  return (
    <>
      <section className={`broadcast-room ${finalMinute ? "is-final-minute" : ""} ${holder?.soldThisRound ? "is-out" : ""}`} id="game-console">
        <div className="broadcast-phase">
          <div><span>EPISODE {episode} · {status?.roundActive ? decisionOpen ? "DECISION" : "ACCUMULATING" : "STANDBY"}</span><strong>{phase}</strong></div>
          <time>{status?.roundActive ? `${decisionOpen ? "DECISIONS LOCK IN" : "THE BANKER CALLS IN"} ${formatCountdown(callCountdown)}` : "WAITING FOR THE BANKER"}</time>
        </div>

        <div className="broadcast-grid">
          <article className="broadcast-panel broadcast-box-panel">
            <div className={`broadcast-case ${decisionOpen ? "is-lit" : ""}`} aria-hidden="true"><i /><b>?</b></div>
            <strong className="broadcast-pot">{hasPot ? `${lamportsToSol(pot)} SOL` : "AWAITING FUNDED BOX"}</strong>
            <span className="broadcast-pot-caption">WHAT&apos;S IN THE BOX · LIVE CREATOR FEES</span>
            <div className="broadcast-wallet-pots">
              <span><b>THE BOX · 80%</b>{positive(pot) ? `${lamportsToSol(pot)} SOL` : "AWAITING FEES"}</span>
              <span><b>BANKER RESERVE · 20%</b>{positive(bankerPot) ? `${lamportsToSol(bankerPot)} SOL` : "AWAITING FEES"}</span>
            </div>
            {status?.potRolloverCount ? <div className="broadcast-rollover">POT HAS ROLLED {status.potRolloverCount}X</div> : null}

            <div className="broadcast-choices">
              <button type="button" className="broadcast-hodl" disabled={!canChoose || Boolean(busy)} aria-pressed={sealedChoice === "cooperate"} onClick={() => void submitDecision("cooperate")}><strong>HODL</strong><span>Reject the guaranteed offer and play for the Box.</span></button>
              <button type="button" className="broadcast-deal" disabled={!canChoose || Boolean(busy)} aria-pressed={sealedChoice === "defect"} onClick={() => void submitDecision("defect")}><strong>NO HODL</strong><span>Take {offer} guaranteed.</span></button>
            </div>
            <p className="broadcast-lock-note">{sealedChoice ? "DECISION SEALED — WAITING FOR THE REVEAL." : decisionOpen ? "CHOICES ARE OPEN · EVERY DECISION REMAINS SEALED" : `CHOICES UNLOCK WHEN THE BANKER CALLS${callCountdown ? ` · ${formatCountdown(callCountdown)}` : ""}`}</p>
            <p className="broadcast-rule-line">SILENCE COUNTS AS HODL. SELLING COUNTS AS NO HODL.</p>
          </article>

          <aside className="broadcast-sidebar">
            <article className={`broadcast-panel broadcast-player ${holder?.soldThisRound ? "player-sold" : ""}`}>
              <span>YOUR BOX · CONTESTANT {shortWallet(address)}</span>
              {!connected ? (
                <div className="broadcast-entry"><strong>SEE YOUR BOX.</strong><p>Connect your wallet to reveal your seat, multiplier, offer, and projected payout.</p><button type="button" onClick={() => document.getElementById("wallet-access")?.click()}>CONNECT — SEE YOUR BOX</button></div>
              ) : !sessionToken ? (
                <div className="broadcast-entry"><strong>ANSWER THE CALL.</strong><p>Sign one message. No transaction, approval, or wallet access.</p><button type="button" disabled={Boolean(busy)} onClick={() => void signIn().catch((signError) => setError(signError instanceof Error ? signError.message : "Sign-in failed."))}>{busy === "signin" ? "SIGNING…" : "SIGN IN"}</button></div>
              ) : holder?.soldThisRound ? (
                <div className="broadcast-out"><strong>YOU&apos;RE OUT.</strong><p>SELLING IS NO HODL. Your streak reset, but you can still watch the Reveal.</p></div>
              ) : !holder?.position ? (
                <div className="broadcast-entry"><strong>GET A BOX.</strong><p>Your wallet must hold 300,000 tokens to enter this episode.</p><button type="button" disabled={Boolean(busy)} onClick={() => void claimSeat()}>{busy === "seat" ? "CHECKING…" : "CHECK MY BALANCE"}</button></div>
              ) : (
                <>
                  <dl className="broadcast-stats">
                    <div><dt>BALANCE</dt><dd>{balance}</dd></div>
                    <div><dt>HOLD STREAK</dt><dd>{streak}</dd></div>
                    <div><dt>TIER</dt><dd>{tierNames[holder.position.tier] ?? holder.position.tierName}</dd></div>
                    <div><dt>MULTIPLIER</dt><dd>{multiplier}</dd></div>
                    <div><dt>PLAYER WEIGHT</dt><dd>{playerWeight}</dd></div>
                    <div><dt>BANKER OFFER</dt><dd>{offer}</dd></div>
                    <div><dt>DECISION</dt><dd>{sealedChoice === "cooperate" ? "HODL · SEALED" : sealedChoice === "defect" ? "NO HODL · SEALED" : "NOT SUBMITTED"}</dd></div>
                  </dl>
                  <div className="broadcast-projection"><span>PROJECTED HODL PAYOUT · ESTIMATE</span><strong>{projected}</strong><small>BALANCE × MULTIPLIER ÷ HODL WEIGHT × REMAINING BOX</small></div>
                </>
              )}
              {message ? <p className="broadcast-message">{message}</p> : null}
              {error ? <p className="broadcast-error" role="alert">{error}</p> : null}
            </article>

            <article className="broadcast-panel broadcast-feed">
              <span>STUDIO FEED</span>
              <div>{events.length ? events.map((event) => <p key={event.id}><time>{event.time}</time><span><b>{event.event}</b>{event.detail}</span></p>) : <p><time>LIVE</time><span><b>AWAITING FIRST UPDATE</b>The studio feed begins with the next funded Box.</span></p>}</div>
            </article>
          </aside>
        </div>
      </section>

      <section className="broadcast-leaderboard" id="leaderboard">
        <header><span>LIVE RANKING</span><h2>LAST CONTESTANTS STANDING.</h2><p>Wallet · score · tier · total SOL paid · wins / losses</p></header>
        {entries.length ? <div className="broadcast-table-wrap"><table><thead><tr><th>#</th><th>Wallet</th><th>Score</th><th>Tier</th><th>SOL Paid</th><th>W / L</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.wallet}><td>{String(entry.rank).padStart(2, "0")}</td><td>{shortWallet(entry.wallet)}</td><td>{entry.score}</td><td>{entry.tier}</td><td>{entry.totalSolAirdropped}</td><td>{entry.wins} / {entry.losses}</td></tr>)}</tbody></table></div> : <p className="broadcast-no-ranking">THE BOARD LIGHTS UP AFTER THE FIRST SETTLEMENT.</p>}
      </section>

      {revealRound ? <div className="broadcast-reveal" role="dialog" aria-modal="true" aria-label="The Reveal"><article><span>EPISODE {String(revealRound.roundNumber).padStart(3, "0")} · THE REVEAL</span><h2>{revealRound.status === "settled" ? "THE BOX OPENS." : "THE BOX STAYS CLOSED."}</h2><strong>{revealRound.weightedHodlBps == null ? "CHOICES REVEALED" : `${(revealRound.weightedHodlBps / 100).toFixed(1)}% WEIGHTED HODL`}</strong><p>{revealRound.status === "settled" ? "HODL players split The Box. Accepted deals were paid separately by the Banker." : `${lamportsToSol(revealRound.rolloverLamports)} SOL rolls into the next episode.`}</p><button type="button" onClick={() => setRevealRound(null)}>RETURN TO THE STUDIO</button></article></div> : null}
    </>
  );
}
