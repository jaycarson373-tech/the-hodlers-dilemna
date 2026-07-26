"use client";

import { createClient } from "@supabase/supabase-js";
import { useWalletConnection } from "@solana/react-hooks";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBingoFeed } from "@/components/use-bingo-feed";
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
import { TICKER } from "@/lib/constants";

type SealedChoice = "cooperate" | "defect";
type GameResponse = { ok?: boolean; message?: string };
type ChatMessage = { id: string; title: string | null; detail: string; occurred_at: string };
type AudienceSignal = { hodl: number | null; noHodl: number | null; phase?: string };

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
const ticketCountFromScore = (score?: string) => Math.max(1, Math.min(99, Math.floor(Number(String(score ?? "0").replace(/,/g, "")) / 1_000_000) || 1));

function BingoTicketWall({ connectedWallet }: { connectedWallet?: string }) {
  const { entries } = usePublicLeaderboard(80);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const cards = entries.map((entry) => ({
    wallet: entry.wallet,
    rank: entry.rank,
    tickets: ticketCountFromScore(entry.score),
    score: entry.score,
    tier: entry.tier,
    isConnected: connectedWallet ? entry.wallet.toLowerCase() === connectedWallet.toLowerCase() : false,
  }));
  const selected = normalizedQuery
    ? cards.find((card) => card.wallet.toLowerCase().includes(normalizedQuery))
    : cards.find((card) => card.isConnected);

  return (
    <section className="bingo-ticket-wall" aria-labelledby="bingo-ticket-wall-title">
      <header>
        <span>LIVE WALLET CARDS</span>
        <h3 id="bingo-ticket-wall-title">THE BOARD EXPANDS WITH EVERY ELIGIBLE WALLET.</h3>
        <label>
          <span>Search wallet</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Paste wallet or search..." />
        </label>
      </header>
      {selected ? (
        <article className="bingo-focus-card">
          <small>ZOOMED CARD</small>
          <strong>{shortWallet(selected.wallet)}</strong>
          <p>{selected.tickets} ticket{selected.tickets === 1 ? "" : "s"} · {selected.tier}</p>
        </article>
      ) : null}
      <div className="bingo-card-grid">
        {cards.length ? cards.map((card) => (
          <article className={`bingo-player-card ${card === selected ? "is-selected" : ""} ${card.isConnected ? "is-connected" : ""}`} key={card.wallet}>
            <small>#{String(card.rank).padStart(2, "0")}</small>
            <strong>{shortWallet(card.wallet)}</strong>
            <span>{card.tickets}x</span>
          </article>
        )) : <p>Wallet cards appear after players claim tickets.</p>}
      </div>
    </section>
  );
}

export function ProtocolConsole({ launchState }: { launchState: "prelaunch" | "live" }) {
  const { connected, wallet } = useWalletConnection();
  const address = wallet?.account.address.toString();
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [holder, setHolder] = useState<HolderState | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [sealedChoice, setSealedChoice] = useState<SealedChoice | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revealRound, setRevealRound] = useState<ProtocolRound | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [signal, setSignal] = useState<AudienceSignal>({ hodl: null, noHodl: null, phase: "waiting" });
  const [chatName, setChatName] = useState("Player");
  const [chatDraft, setChatDraft] = useState("");
  const previousRound = useRef<ProtocolRound | null>(null);
  const { events } = useBingoFeed(8);

  const realtime = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }, []);

  const refresh = useCallback(async (authToken = sessionToken) => {
    if (launchState === "prelaunch") return;
    if (!protocolApiUrl) return;
    const nextStatus = await protocolRequest<ProtocolStatus>("/api/status");
    setStatus(nextStatus);
    const target = nextStatus.roundActive ? nextStatus.round?.closesAt : nextStatus.nextRoundAt;
    setCountdown(remainingSeconds(target));
    if (previousRound.current?.status === "open" && nextStatus.round && nextStatus.round.status !== "open") {
      setRevealRound(nextStatus.round);
    }
    previousRound.current = nextStatus.round ?? null;
    if (nextStatus.round?.roundNumber) {
      try {
        setSignal(await protocolRequest<AudienceSignal>(`/api/audience-signal/${nextStatus.round.roundNumber}`));
      } catch {
        setSignal({ hodl: null, noHodl: null, phase: "waiting" });
      }
    }
    if (address && authToken && nextStatus.configured) {
      const nextHolder = await protocolRequest<HolderState>(`/api/holder/${address}`, undefined, authToken);
      setHolder(nextHolder);
      setSealedChoice(nextHolder.participationStatus === "HOLD" ? "cooperate" : nextHolder.participationStatus === "JEET" ? "defect" : null);
    }
  }, [address, launchState, sessionToken]);

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

  const refreshChat = useCallback(async () => {
    if (launchState === "prelaunch") return;
    if (!protocolApiUrl) return;
    const nextMessages = await protocolRequest<ChatMessage[]>("/api/chat");
    setChatMessages(nextMessages);
  }, [launchState]);

  useEffect(() => {
    if (!protocolApiUrl) return;
    const initial = window.setTimeout(() => void refreshChat().catch(() => undefined), 0);
    const interval = window.setInterval(() => void refreshChat().catch(() => undefined), 8_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [refreshChat]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
      setNow(Date.now());
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    queueMicrotask(async () => {
      setHolder(null);
      setSealedChoice(null);
      setMessage("");
      setError("");
      if (!address || !protocolApiUrl) { setSessionToken(""); return; }
      const stored = window.sessionStorage.getItem(`onchain-bingo-session:${address}`) ?? "";
      if (!stored) { setSessionToken(""); return; }
      try {
        await protocolRequest("/api/auth/session", undefined, stored);
        setSessionToken(stored);
      } catch {
        window.sessionStorage.removeItem(`onchain-bingo-session:${address}`);
        setSessionToken("");
      }
    });
  }, [address]);

  const signIn = useCallback(async () => {
    if (!wallet || !address) throw new Error("Connect a Solana wallet first.");
    if (!wallet.signMessage) throw new Error("This wallet cannot sign the On-Chain Bingo message.");
    setBusy("signin"); setError("");
    try {
      const challenge = await protocolRequest<{ message: string }>(`/api/auth/challenge?wallet=${encodeURIComponent(address)}`);
      const signature = await wallet.signMessage(new TextEncoder().encode(challenge.message));
      const verified = await protocolRequest<{ token: string }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ wallet: address, message: challenge.message, signature: base64FromBytes(signature) }),
      });
      setSessionToken(verified.token);
      window.sessionStorage.setItem(`onchain-bingo-session:${address}`, verified.token);
      setMessage("CARD VERIFIED — YOUR TICKET IS READY.");
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
      setMessage(response.message ?? "YOUR CARD IS ON THE BOARD.");
      await refresh(token);
    } catch (seatError) {
      setError(seatError instanceof Error ? seatError.message : "This seat could not be verified.");
    } finally { setBusy(""); }
  }, [address, refresh, sessionToken, signIn, wallet]);

  const activeRoundNumber = status?.round?.roundNumber;
  const submitDecision = useCallback(async (choice: SealedChoice) => {
    if (!wallet || !address || !activeRoundNumber) return;
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
      setMessage("ENTRY SEALED — LAST ACTION COUNTS.");
      await refresh(token);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "The decision could not be sealed.");
    } finally { setBusy(""); }
  }, [activeRoundNumber, address, refresh, sessionToken, signIn, wallet]);

  const submitChat = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wallet || !address) { setChatOpen(true); setError("Connect wallet to chat."); return; }
    const draft = chatDraft.trim();
    if (!draft) return;
    setBusy("chat"); setError("");
    try {
      const token = sessionToken || await signIn();
      await protocolRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({ wallet: address, name: chatName || "Player", message: draft }),
      }, token);
      setChatDraft("");
      await refreshChat();
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Chat could not be sent.");
    } finally { setBusy(""); }
  }, [address, chatDraft, chatName, refreshChat, sessionToken, signIn, wallet]);

  const decimals = status?.tokenDecimals ?? 6;
  const round = status?.round;
  const pot = status?.boxWalletBalanceLamports ?? round?.potLamports ?? status?.availablePoolLamports;
  const hasPot = positive(pot);
  const decisionWindow = Number(status?.decisionWindowSeconds ?? 900);
  const decisionOpen = Boolean(status?.roundActive && round?.status === "open" && countdown > 0 && countdown <= decisionWindow);
  const callCountdown = decisionOpen ? countdown : Math.max(0, countdown - decisionWindow);
  const finalMinute = Boolean(status?.roundActive && round?.status === "open" && countdown > 0 && countdown <= 60);
  const heavySignal = Boolean(status?.roundActive && round?.status === "open" && countdown > 60 && countdown <= 300);
  const liveSignal = Boolean(status?.roundActive && round?.status === "open" && countdown > 300 && signal.hodl !== null && signal.noHodl !== null);
  const heavyDrift = Math.round(Math.sin(now / 5_500) * 4);
  const heavyHold = 50 + heavyDrift;
  const hasPosition = Boolean(holder?.position && positive(holder.position.amount));
  const canChoose = Boolean(connected && sessionToken && hasPosition && decisionOpen && !holder?.soldThisRound);
  const balance = holder ? baseUnitsToTokenAmount(holder.walletTokenBalance, decimals) : "—";
  const streakSeconds = Number(holder?.position?.streakSeconds ?? 0);
  const streak = streakSeconds >= 86_400 ? `${Math.floor(streakSeconds / 86_400)} DAYS` : `${Math.floor(streakSeconds / 3_600)} HOURS`;
  const timeHeldBoost = holder ? `${(holder.multiplierBps / 10_000).toFixed(1)}×` : "—";
  const playerWeight = holder ? baseUnitsToTokenAmount(holder.playerWeight, decimals) : "—";
  const offer = positive(holder?.bankerOfferLamports) ? `${lamportsToSol(holder?.bankerOfferLamports)} SOL` : "POT FORMING";
  const projected = positive(holder?.projectedShareLamports) ? `${lamportsToSol(holder?.projectedShareLamports)} SOL` : "POT FORMING";
  const episode = status?.currentRound ? String(status.currentRound).padStart(3, "0") : status ? "WAITING" : "—";
  const nextCallCountdown = status?.nextRoundAt ? remainingSeconds(status.nextRoundAt) : 0;
  const standbyCountdown = nextCallCountdown ? formatCountdown(nextCallCountdown) : "";
  const phase = !status ? "BINGO ROOM SYNCING" : !status.configured ? "BINGO ROOM WARMING UP" : !status.roundActive ? "PRIZE POOL FORMING" : finalMinute ? "FINAL DRAW LOCK" : decisionOpen ? "CARDS LIVE" : "BOARD IS BUILDING";

  if (launchState === "prelaunch") {
    return (
      <section className="broadcast-room" id="game-console">
        <div className="broadcast-phase">
          <div><span>ON-CHAIN BINGO</span><strong>FIRST GAME AT LAUNCH. REAL DRAWS ONLY.</strong></div>
          <time><span>NEXT UP</span><b>THE HALL OPENS AT LAUNCH</b></time>
        </div>
        <p className="broadcast-rule-line">No fake draws. The board fills with real settled rounds.</p>
      </section>
    );
  }

  return (
    <>
      <section className={`broadcast-room ${finalMinute ? "is-final-minute" : ""} ${holder?.soldThisRound ? "is-out" : ""}`} id="game-console">
        <div className="broadcast-phase">
          <div><span>BINGO ROUND {episode} · {status?.roundActive ? decisionOpen ? "DRAW LIVE" : "LIVE" : "STANDBY"}</span><strong>{phase}</strong></div>
          <time><span>{status?.roundActive ? "DRAW REVEALS IN" : standbyCountdown ? "NEXT FAST ROUND" : "NEXT UP"}</span><b>{status?.roundActive ? formatCountdown(countdown) : standbyCountdown || "ON-CHAIN BINGO"}</b></time>
        </div>

        <div className="broadcast-grid">
          <article className="broadcast-panel broadcast-box-panel">
            <div className={`broadcast-case ${decisionOpen ? "is-lit" : ""}`} aria-hidden="true"><i /><b>?</b></div>
            <strong className="broadcast-pot">{pot == null ? "—" : hasPot ? `${lamportsToSol(pot)} SOL` : "POOL FORMING"}</strong>
            <span className="broadcast-pot-caption">LIVE BINGO POOL · {TICKER}</span>
            <div className="broadcast-wallet-pots">
              <span><b>MAIN POOL</b>{pot == null ? "—" : positive(pot) ? `${lamportsToSol(pot)} SOL` : "POOL FORMING"}</span>
            </div>
            {status?.potRolloverCount ? <div className="broadcast-rollover">POOL HAS ROLLED {status.potRolloverCount}X</div> : null}

            <div className="broadcast-signal" aria-label="Audience signal">
              <span>{finalMinute ? "FINAL MINUTE — DRAW LOCKED" : heavySignal ? "FINAL FOUR — DRAW OBFUSCATED" : liveSignal ? "BOARD SIGNAL — LIVE, NOT FINAL" : "BINGO SIGNAL FORMING"}</span>
              {finalMinute ? (
                <small>The winning card stays hidden until the reveal.</small>
              ) : heavySignal ? (
                <>
                  <div className="is-ambiguous"><i style={{ width: `${heavyHold}%` }} /><b style={{ width: `${100 - heavyHold}%` }} /></div>
                  <p><b>CARDS ???</b><b>POOL ???</b></p>
                  <small>The draw is hard to read now.</small>
                </>
              ) : liveSignal ? (
                <>
                  <div><i style={{ width: `${signal.hodl ?? 0}%` }} /><b style={{ width: `${signal.noHodl ?? 0}%` }} /></div>
                  <p><b>CARDS {signal.hodl}%</b><b>POOL {signal.noHodl}%</b></p>
                  <small>Not the final draw. Winner appears at reveal.</small>
                </>
              ) : (
                <small>The board appears once the round is live.</small>
              )}
            </div>

            <div className="broadcast-choices">
              <button type="button" className="broadcast-hodl" disabled={!canChoose || Boolean(busy)} aria-busy={busy === "cooperate"} aria-pressed={sealedChoice === "cooperate"} onClick={() => void submitDecision("cooperate")}><strong>ENTER CARD</strong><span>Keep your wallet on the live bingo board.</span></button>
              <button type="button" className="broadcast-deal" disabled={!canChoose || Boolean(busy)} aria-busy={busy === "defect"} aria-pressed={sealedChoice === "defect"} onClick={() => void submitDecision("defect")}><strong>PASS ROUND</strong><span>Skip this draw without adding a new card action.</span></button>
            </div>
            <p className="broadcast-lock-note">{sealedChoice ? "CARD ACTION SEALED — LAST ACTION COUNTS." : finalMinute ? "FINAL MINUTE · DRAW HIDDEN" : decisionOpen ? "CARD ACTIONS ARE OPEN" : `BOARD OPENS IN ${formatCountdown(callCountdown)}`}</p>
            <p className="broadcast-sell-rule">1M TOKENS = 1 TICKET. MORE TOKENS MEAN MORE CARDS.</p>
            <p className="broadcast-rule-line">80% FUNDS THE MAIN BINGO POOL. 20% BUILDS THE JACKPOT SPIN.</p>
          </article>

          <aside className="broadcast-sidebar">
            <article className={`broadcast-panel broadcast-player ${holder?.soldThisRound ? "player-sold" : ""}`}>
              <span>YOUR BINGO CARD · {shortWallet(address)}</span>
              {!connected ? (
                <div className="broadcast-entry"><strong>FIND YOUR CARD.</strong><p>Connect your wallet to reveal tickets, holding weight, and prize estimate.</p><button type="button" onClick={() => document.getElementById("wallet-access")?.click()}>CONNECT WALLET</button></div>
              ) : !sessionToken ? (
                <div className="broadcast-entry"><strong>ENTER BINGO.</strong><p>Sign one message. No transaction, approval, or wallet access.</p><button type="button" disabled={Boolean(busy)} aria-busy={busy === "signin"} onClick={() => void signIn().catch((signError) => setError(signError instanceof Error ? signError.message : "Sign-in failed."))}>{busy === "signin" ? "SIGNING…" : "SIGN IN"}</button></div>
              ) : holder?.soldThisRound ? (
                <div className="broadcast-out"><strong>POSITION CHANGED.</strong><p>Your ticket count updates from your live wallet balance.</p></div>
              ) : !holder?.position ? (
                <div className="broadcast-entry"><strong>CLAIM YOUR CARD.</strong><p>Verify the required {TICKER} balance and enter the bingo board.</p><button type="button" disabled={Boolean(busy)} aria-busy={busy === "seat"} onClick={() => void claimSeat()}>{busy === "seat" ? "CLAIMING…" : "CLAIM MY CARD"}</button></div>
              ) : (
                <>
                  <dl className="broadcast-stats">
                    <div><dt>BALANCE</dt><dd>{balance}</dd></div>
                    <div><dt>TICKETS</dt><dd>{ticketCountFromScore(balance)}</dd></div>
                    <div><dt>HELD</dt><dd>{streak}</dd></div>
                    <div><dt>TIER</dt><dd>{tierNames[holder.position.tier] ?? holder.position.tierName}</dd></div>
                    <div><dt>TIME BOOST</dt><dd>{timeHeldBoost}</dd></div>
                    <div><dt>HOLDING WEIGHT</dt><dd>{playerWeight}</dd></div>
                    <div><dt>JACKPOT RESERVE</dt><dd>{offer}</dd></div>
                    <div><dt>CARD STATUS</dt><dd>{sealedChoice === "cooperate" ? "ENTERED" : sealedChoice === "defect" ? "PASSED" : "READY"}</dd></div>
                  </dl>
                  <div className="broadcast-projection"><span>PROJECTED BINGO PRIZE · ESTIMATE</span><strong>{projected}</strong><small>TICKETS × TIME BOOST ÷ BOARD WEIGHT × MAIN POOL</small></div>
                </>
              )}
              {message ? <p className="broadcast-message">{message}</p> : null}
              {error ? <p className="broadcast-error" role="alert">{error}</p> : null}
            </article>

            <article className="broadcast-panel broadcast-feed">
              <span>LIVE DRAW FEED</span>
              <div>{events.length ? events.map((event) => <p key={event.id}><time>{event.time}</time><span><b>{event.event}</b>{event.detail}</span></p>) : <p><time>LIVE</time><span><b>STUDIO FEED READY</b>The feed begins with the next funded pot.</span></p>}</div>
            </article>
          </aside>
        </div>
        <BingoTicketWall connectedWallet={address} />
      </section>

      {revealRound ? <div className="broadcast-reveal" role="dialog" aria-modal="true" aria-label="The Reveal"><article><span>ROUND {String(revealRound.roundNumber).padStart(3, "0")} · BINGO REVEAL</span><h2>{revealRound.status === "settled" ? "WINNER DRAWN." : "POOL ROLLED."}</h2><strong>{revealRound.weightedHodlBps == null ? "CARD RESULT REVEALED" : `${(revealRound.weightedHodlBps / 100).toFixed(1)}% BOARD WEIGHT`}</strong><p>{revealRound.status === "settled" ? "The winning card splits the active pool." : `${lamportsToSol(revealRound.rolloverLamports)} SOL rolls into the next draw.`}</p><button type="button" onClick={() => setRevealRound(null)}>RETURN TO THE BOARD</button></article></div> : null}
      <button type="button" className="broadcast-chat-button" onClick={() => setChatOpen((open) => !open)}>CHAT</button>
      {chatOpen ? (
        <aside className="broadcast-chat-popover" aria-label="Live chat">
          <header><span>BINGO CHAT</span><button type="button" onClick={() => setChatOpen(false)}>×</button></header>
          <div className="broadcast-chat-log">
            {chatMessages.length ? chatMessages.map((item) => <p key={item.id}><b>{item.title || "Player"}</b><span>{item.detail}</span></p>) : <p><b>Studio</b><span>Be first in the room.</span></p>}
          </div>
          <form onSubmit={submitChat}>
            <input value={chatName} onChange={(event) => setChatName(event.target.value)} maxLength={24} placeholder="Name" aria-label="Chat name" />
            <textarea value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} maxLength={160} placeholder={connected ? "Say something..." : "Connect wallet to chat"} aria-label="Chat message" />
            <button type="submit" disabled={!connected || !chatDraft.trim() || busy === "chat"} aria-busy={busy === "chat"}>{busy === "chat" ? "SENDING" : "SEND"}</button>
          </form>
        </aside>
      ) : null}
    </>
  );
}
