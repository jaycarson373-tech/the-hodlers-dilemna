"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBingoFeed } from "@/components/use-bingo-feed";
import { usePublicLeaderboard } from "@/components/use-public-leaderboard";
import {
  lamportsToSol,
  protocolRequest,
  type ProtocolStatus,
  type RoundHistoryEntry,
} from "@/lib/protocol-api";
import { TICKER } from "@/lib/constants";

type HallVariant = "home" | "game";
type LiveEntry = {
  wallet: string;
  snapshotBalance: string;
  cardCount: number;
  firstCard: number[];
};
type LiveEntriesResponse = {
  gameNumber: string | null;
  entries: LiveEntry[];
};
type LiveCardsResponse = {
  gameNumber: string;
  wallet: string;
  cardCount: number;
  cards: Array<{ cardIndex: number; numbers: number[] }>;
};

const shortWallet = (wallet: string) => `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;

const numericScore = (score: string) => {
  const parsed = Number(score.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const ticketCount = (score: string) => Math.max(1, Math.floor(numericScore(score) / 1_000_000) || 1);

const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const cardNumbers = (wallet: string, cardIndex: number) => {
  let seed = hashSeed(`${wallet}:${cardIndex}`);
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const numbers: Array<number | "★"> = [];
  const usedByColumn = Array.from({ length: 5 }, () => new Set<number>());
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      if (column === 2 && row === 2) {
        numbers.push("★");
        continue;
      }
      const rangeStart = column * 15 + 1;
      const used = usedByColumn[column];
      let value = rangeStart + (next() % 15);
      while (used.has(value)) value = rangeStart + (next() % 15);
      used.add(value);
      numbers.push(value);
    }
  }
  return numbers;
};

const formatClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

const parseCalledBall = (value: string) => {
  const match = value.match(/\b([BINGO])[-\s]?(\d{1,2})\b/i);
  if (!match) return null;
  return { letter: match[1].toUpperCase(), number: Number(match[2]) };
};

function CardFace({
  wallet,
  cardIndex,
  serverNumbers,
  calledNumbers = [],
  compact = false,
}: {
  wallet: string;
  cardIndex: number;
  serverNumbers?: number[];
  calledNumbers?: number[];
  compact?: boolean;
}) {
  const fallbackNumbers = useMemo(() => cardNumbers(wallet, cardIndex), [cardIndex, wallet]);
  const numbers = serverNumbers?.map((number) => number === 0 ? "★" : number) ?? fallbackNumbers;
  const called = useMemo(() => new Set(calledNumbers), [calledNumbers]);
  return (
    <div className={`live-card-face ${compact ? "is-compact" : ""}`}>
      <div className="live-card-head">
        {["B", "I", "N", "G", "O"].map((letter) => <b key={letter}>{letter}</b>)}
      </div>
      <div className="live-card-numbers">
        {numbers.map((number, index) => (
          <span
            className={number === "★" ? "is-free" : called.has(Number(number)) ? "is-called" : ""}
            key={`${number}-${index}`}
          >
            {number}
          </span>
        ))}
      </div>
      <p>CARD {String(cardIndex + 1).padStart(3, "0")} · {shortWallet(wallet)}</p>
    </div>
  );
}

export function BingoLiveHall({
  launchState,
  variant = "home",
}: {
  launchState: "prelaunch" | "live";
  variant?: HallVariant;
}) {
  const { wallet } = useWalletConnection();
  const connectedWallet = wallet?.account.address.toString();
  const { entries } = usePublicLeaderboard(120);
  const { events } = useBingoFeed(18);
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [history, setHistory] = useState<RoundHistoryEntry[]>([]);
  const [liveEntries, setLiveEntries] = useState<LiveEntry[]>([]);
  const [serverCards, setServerCards] = useState<Record<string, number[][]>>({});
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [selectedCard, setSelectedCard] = useState(0);

  const refresh = useCallback(async () => {
    if (launchState !== "live") return;
    try {
      const [nextStatus, nextHistory, nextEntries] = await Promise.all([
        protocolRequest<ProtocolStatus>("/api/status"),
        protocolRequest<RoundHistoryEntry[]>("/api/round-history"),
        protocolRequest<LiveEntriesResponse>("/api/bingo/entries"),
      ]);
      setStatus(nextStatus);
      setHistory(nextHistory);
      setLiveEntries(nextEntries.entries);
    } catch {
      // The hall remains readable while the live feed reconnects.
    }
  }, [launchState]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const dataTimer = window.setInterval(() => void refresh(), 15_000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(dataTimer);
      window.clearInterval(clockTimer);
    };
  }, [refresh]);

  const wallets = liveEntries.length
    ? liveEntries.map((entry, index) => ({
        wallet: entry.wallet,
        rank: index + 1,
        score: entry.snapshotBalance,
        tier: `${entry.cardCount} card${entry.cardCount === 1 ? "" : "s"}`,
        totalSolAirdropped: "0",
        wins: 0,
        losses: 0,
        tickets: entry.cardCount,
        firstCard: entry.firstCard,
      }))
    : entries.map((entry) => ({
        ...entry,
        tickets: ticketCount(entry.score),
        firstCard: undefined,
      }));
  const normalizedQuery = query.trim().toLowerCase();
  const matchingWallets = normalizedQuery
    ? wallets.filter((entry) => entry.wallet.toLowerCase().includes(normalizedQuery))
    : wallets;
  const effectiveSelectedWallet = selectedWallet || connectedWallet || "";
  const selected = wallets.find((entry) => entry.wallet === effectiveSelectedWallet)
    ?? matchingWallets[0]
    ?? null;
  const visibleCards = matchingWallets.slice(0, variant === "game" ? 120 : 72);
  const totalCards = status?.totalCards ?? wallets.reduce((total, entry) => total + entry.tickets, 0);
  const round = status?.round;
  const remaining = round?.closesAt
    ? Math.max(0, Math.floor((new Date(round.closesAt).getTime() - now) / 1_000))
    : 0;
  const pot = round?.potLamports ?? status?.availablePoolLamports ?? status?.boxWalletBalanceLamports;
  const calledBalls = (round?.calledNumbers?.length
    ? round.calledNumbers.map((number) => ({
        letter: ["B", "I", "N", "G", "O"][Math.floor((number - 1) / 15)],
        number,
      }))
    : events.map((event) => parseCalledBall(`${event.event} ${event.detail}`)))
    .filter((ball): ball is { letter: string; number: number } => Boolean(ball))
    .filter((ball, index, list) => list.findIndex((item) => item.letter === ball.letter && item.number === ball.number) === index)
    .slice(0, 12);
  const currentBall = calledBalls.at(-1) ?? null;
  const latestSettled = history.find((entry) => entry.status === "settled" || entry.status === "rolled_over");
  const winnerWallet = round?.winnerWallet ?? latestSettled?.winnerWallet ?? null;
  const roundLive = Boolean(status?.roundActive && remaining > 0);
  const gameLabel = status?.currentRound ? `GAME ${String(status.currentRound).padStart(3, "0")}` : "NEXT GAME";

  useEffect(() => {
    if (!selected?.wallet || !status?.currentRound || serverCards[selected.wallet]) return;
    let active = true;
    void protocolRequest<LiveCardsResponse>(
      `/api/bingo/cards/${encodeURIComponent(selected.wallet)}?game=${encodeURIComponent(status.currentRound)}&limit=50`,
    ).then((response) => {
      if (!active) return;
      setServerCards((current) => ({
        ...current,
        [selected.wallet]: response.cards.map((card) => card.numbers),
      }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [selected?.wallet, serverCards, status?.currentRound]);

  return (
    <section className={`bingo-live-hall is-${variant}`} id="live-round" aria-labelledby={`live-hall-${variant}`}>
      <header className="live-hall-heading">
        <span>THE LIVE HALL</span>
        <h2 id={`live-hall-${variant}`}>{roundLive ? "Eyes down. The draw is live." : "The next game is filling."}</h2>
        <p>Search any wallet, open its book of cards, and watch every call land across the hall.</p>
      </header>

      <div className="live-hall-stats" aria-label="Live bingo status">
        <div><span>GAME</span><strong>{gameLabel}</strong></div>
        <div><span>TIME</span><strong>{roundLive ? formatClock(remaining) : "WAITING"}</strong></div>
        <div><span>LIVE POT</span><strong>{pot && Number(pot) > 0 ? `${lamportsToSol(pot)} SOL` : "FORMING"}</strong></div>
        <div><span>WALLETS</span><strong>{wallets.length ? wallets.length.toLocaleString() : "—"}</strong></div>
        <div><span>CARDS</span><strong>{totalCards ? totalCards.toLocaleString() : "—"}</strong></div>
      </div>

      <div className="live-hall-stage">
        <article className="live-caller">
          <div className="live-call-bubble">
            <span>{currentBall ? "Latest call" : roundLive ? "The cage is spinning…" : "Waiting for the caller…"}</span>
            <strong>{currentBall ? `${currentBall.letter}-${currentBall.number}` : "EYES DOWN"}</strong>
          </div>
          <div className={`live-caller-avatar ${roundLive ? "is-live" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bingo-logo.jpg" alt="Bingo caller" width="900" height="900" />
          </div>
          <b>YOUR CALLER TONIGHT</b>
          <small>{roundLive ? "LIVE FROM THE ON-CHAIN HALL" : "THE HALL IS GETTING READY"}</small>
        </article>

        <article className="live-cage-column" aria-label="Bingo number cage">
          <div className={`live-cage-machine ${roundLive ? "is-spinning" : ""}`}>
            <i /><i /><i /><i /><i /><i />
          </div>
          <div className="live-current-ball">
            <span>{currentBall?.letter ?? "•"}</span>
            <strong>{currentBall?.number ?? "—"}</strong>
          </div>
          <p>CALLED THIS GAME</p>
          <div className="live-called-numbers">
            {calledBalls.length
              ? calledBalls.map((ball) => <span key={`${ball.letter}-${ball.number}`}>{ball.letter}{ball.number}</span>)
              : <small>Real calls appear here.</small>}
          </div>
        </article>

        <article className="live-spectate-card">
          <label>
            <span>SPECTATE A WALLET</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedCard(0);
              }}
              placeholder="Paste wallet address"
            />
          </label>
          {selected ? (
            <>
              <div className="spectate-card-meta">
                <span>{shortWallet(selected.wallet)}</span>
                <strong>{selected.tickets} CARD{selected.tickets === 1 ? "" : "S"}</strong>
              </div>
              <CardFace
                wallet={selected.wallet}
                cardIndex={selectedCard}
                serverNumbers={serverCards[selected.wallet]?.[selectedCard] ?? selected.firstCard}
                calledNumbers={round?.calledNumbers}
              />
              {selected.tickets > 1 ? (
                <div className="spectate-card-tabs" aria-label="Select wallet card">
                  {Array.from({ length: Math.min(selected.tickets, 20) }, (_, index) => (
                    <button
                      className={index === selectedCard ? "is-active" : ""}
                      key={index}
                      onClick={() => setSelectedCard(index)}
                      type="button"
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="live-card-empty">Wallet cards appear when eligible balances enter the hall.</div>
          )}
        </article>
      </div>

      <div className="wallet-card-wall">
        <header>
          <div><span>EVERY WALLET IN THE HALL</span><h3>{wallets.length ? `${wallets.length.toLocaleString()} BOOKS OF CARDS` : "THE BOARD IS READY"}</h3></div>
          <p>Tap any wallet to zoom into its cards.</p>
        </header>
        {visibleCards.length ? (
          <div className="wallet-card-wall-grid">
            {visibleCards.map((entry) => (
              <button
                className={entry.wallet === selected?.wallet ? "is-selected" : ""}
                key={entry.wallet}
                onClick={() => {
                  setSelectedWallet(entry.wallet);
                  setSelectedCard(0);
                }}
                type="button"
              >
                <CardFace
                  compact
                  wallet={entry.wallet}
                  cardIndex={0}
                  serverNumbers={entry.firstCard}
                  calledNumbers={round?.calledNumbers}
                />
                <span>{shortWallet(entry.wallet)}</span>
                <strong>{entry.tickets} CARD{entry.tickets === 1 ? "" : "S"}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="wallet-card-wall-empty">FIRST GAME AT LAUNCH. REAL CARDS ONLY.</div>
        )}
      </div>

      <div className="live-settlement-strip">
        <div><span>LAST WINNER</span><strong>{winnerWallet ? shortWallet(winnerWallet) : latestSettled ? "RESULT SETTLED" : "AWAITING FIRST WINNER"}</strong></div>
        <div><span>LAST PAID</span><strong>{latestSettled && Number(latestSettled.paidLamports) > 0 ? `${lamportsToSol(latestSettled.paidLamports)} SOL` : "AWAITING PAYOUT"}</strong></div>
        <div><span>FEES COLLECTED</span><strong>{pot && Number(pot) > 0 ? `${lamportsToSol(pot)} SOL` : "POOL FORMING"}</strong></div>
        <div><span>STATUS</span><strong>{roundLive ? "DRAWING LIVE" : launchState === "prelaunch" ? "LAUNCH QUEUED" : "NEXT GAME FILLING"}</strong></div>
      </div>

      <p className="live-hall-proof">{TICKER} eligibility and settled payouts come from the live protocol feed. No fake draws.</p>
    </section>
  );
}
