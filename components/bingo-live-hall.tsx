"use client";

import { type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useBingoFeed } from "@/components/use-bingo-feed";
import { usePublicLeaderboard } from "@/components/use-public-leaderboard";
import {
  lamportsToSol,
  protocolRequest,
  type ProtocolStatus,
  type RoundHistoryEntry,
} from "@/lib/protocol-api";
import { CA } from "@/lib/constants";

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
type ChatMessage = {
  id: string;
  title: string | null;
  detail: string;
  occurred_at: string;
};

const shortWallet = (wallet: string) => `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;

const numericScore = (score: string) => {
  const parsed = Number(score.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeCardCount = (value: unknown, maximum = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(0, maximum), Math.max(0, Math.floor(parsed)));
};
const ticketCount = (score: string, tokensPerCard: number, cardCap: number) => (
  safeCardCount(Math.floor(numericScore(score) / Math.max(1, tokensPerCard)), cardCap)
);
const cardCountFromRawBalance = (
  rawBalance: string,
  tokensPerCard: string,
  decimals: number,
  cardCap: number,
) => {
  try {
    const [whole = "0", fractional = ""] = tokensPerCard.trim().split(".");
    const normalizedFraction = fractional.slice(0, decimals).padEnd(decimals, "0");
    const price = BigInt(`${whole || "0"}${normalizedFraction}` || "0");
    if (price <= 0n) return 0;
    const count = BigInt(rawBalance) / price;
    return safeCardCount(count > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(count), cardCap);
  } catch {
    return 0;
  }
};
const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const cageBalls = (() => {
  const rowCounts = [11, 10, 10, 8, 7, 4];
  let number = 1;

  return rowCounts.flatMap((count, row) => (
    Array.from({ length: count }, (_, column) => {
      const seed = hashSeed(`cage-ball:${number}`);
      const jitterX = ((seed >>> 5) % 31) / 10 - 1.5;
      const jitterY = ((seed >>> 12) % 27) / 10 - 1.3;
      const rowSlope = (column - (count - 1) / 2) * ((((seed >>> 19) % 5) - 2) / 18);
      const x = 50 + (column - (count - 1) / 2) * 6.85 + (row % 2 ? 2.2 : -.8) + jitterX;
      const y = 84 - row * 7.75 + jitterY + rowSlope;
      const ball = { number, seed, x, y, row };
      number += 1;
      return ball;
    })
  ));
})();

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
  latestNumber,
}: {
  wallet: string;
  cardIndex: number;
  serverNumbers?: number[];
  calledNumbers?: number[];
  compact?: boolean;
  latestNumber?: number;
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
            className={[
              number === "★" ? "is-free" : "",
              called.has(Number(number)) ? "is-called" : "",
              latestNumber === Number(number) ? "is-latest" : "",
            ].filter(Boolean).join(" ")}
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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [caCopied, setCaCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatName, setChatName] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatStatus, setChatStatus] = useState<"idle" | "sent" | "error">("idle");

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

  useEffect(() => {
    const wallet = new URLSearchParams(window.location.search).get("wallet")?.trim();
    const timer = window.setTimeout(() => {
      if (wallet) setQuery(wallet);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const refreshChat = useCallback(async () => {
    try {
      setChatMessages(await protocolRequest<ChatMessage[]>("/api/chat"));
    } catch {
      // Chat is non-critical; keep the live hall running.
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshChat(), 0);
    const timer = window.setInterval(() => void refreshChat(), 6_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refreshChat]);

  const submitChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = chatName.trim() || "Player";
    const message = chatDraft.trim();
    if (!message || chatBusy) return;
    setChatBusy(true);
    setChatStatus("idle");
    try {
      const response = await protocolRequest<{ ok: true; message: ChatMessage }>("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      setChatMessages((current) => (
        current.some((item) => item.id === response.message.id)
          ? current
          : [...current, response.message].slice(-40)
      ));
      setChatDraft("");
      setChatStatus("sent");
      window.setTimeout(() => setChatStatus("idle"), 1800);
    } catch {
      setChatStatus("error");
    } finally {
      setChatBusy(false);
    }
  };

  const tokensPerCard = Math.max(1, Number(status?.minHoldingTokens ?? 1_000_000));
  const cardCap = status?.tokenSupplyRaw
    ? cardCountFromRawBalance(
        (BigInt(status.tokenSupplyRaw) / 20n).toString(),
        status.minHoldingTokens ?? "1000000",
        status.tokenDecimals ?? 6,
        Number.MAX_SAFE_INTEGER,
      )
    : Math.max(1, Math.floor((1_000_000_000 * 0.05) / tokensPerCard));
  const maxEligibleRaw = (() => {
    try {
      return status?.tokenSupplyRaw ? BigInt(status.tokenSupplyRaw) / 20n : null;
    } catch {
      return null;
    }
  })();
  const eligibleLiveEntries = maxEligibleRaw === null
    ? liveEntries
    : liveEntries.filter((entry) => {
        try {
          return BigInt(entry.snapshotBalance) <= maxEligibleRaw;
        } catch {
          return false;
        }
      });
  const wallets = eligibleLiveEntries.length
    ? eligibleLiveEntries.map((entry, index) => {
        const balanceTickets = cardCountFromRawBalance(
          entry.snapshotBalance,
          status?.minHoldingTokens ?? "1000000",
          status?.tokenDecimals ?? 6,
          cardCap,
        );
        const tickets = status?.minHoldingTokens && status?.tokenDecimals !== undefined
          ? balanceTickets
          : safeCardCount(entry.cardCount, cardCap);
        return {
        wallet: entry.wallet,
        rank: index + 1,
        score: entry.snapshotBalance,
        tier: `${tickets} card${tickets === 1 ? "" : "s"}`,
        totalSolAirdropped: "0",
        wins: 0,
        losses: 0,
        tickets,
        firstCard: entry.firstCard,
        };
      }).filter((entry) => entry.tickets > 0)
    : entries.map((entry) => ({
        ...entry,
        tickets: ticketCount(entry.score, tokensPerCard, cardCap),
        firstCard: undefined,
      })).filter((entry) => entry.tickets > 0);
  const normalizedQuery = query.trim().toLowerCase();
  const matchingWallets = normalizedQuery
    ? wallets.filter((entry) => entry.wallet.toLowerCase().includes(normalizedQuery))
    : wallets;
  const effectiveSelectedWallet = selectedWallet || "";
  const selected = wallets.find((entry) => entry.wallet === effectiveSelectedWallet)
    ?? (normalizedQuery ? matchingWallets[0] : null)
    ?? null;
  const visibleCards = matchingWallets.slice(0, variant === "game" ? 120 : 72);
  const walletCardTotal = wallets.reduce((total, entry) => total + entry.tickets, 0);
  const statusCardCeiling = cardCap * Math.max(0, Number(status?.activeHolders ?? 0));
  const totalCards = wallets.length
    ? walletCardTotal
    : statusCardCeiling
      ? Math.min(Math.max(0, Number(status?.totalCards ?? 0)), statusCardCeiling)
      : 0;
  const round = status?.round;
  const remaining = round?.closesAt
    ? Math.max(0, Math.floor((new Date(round.closesAt).getTime() - now) / 1_000))
    : 0;
  const lobbyRemaining = !status?.roundActive && status?.nextRoundAt
    ? Math.max(0, Math.ceil((new Date(status.nextRoundAt).getTime() - now) / 1_000))
    : 0;
  const pot = round?.potLamports ?? status?.availablePoolLamports ?? status?.boxWalletBalanceLamports;
  const allCalledBalls = (round?.calledNumbers?.length
    ? round.calledNumbers.map((number) => ({
        letter: ["B", "I", "N", "G", "O"][Math.floor((number - 1) / 15)],
        number,
      }))
    : events.map((event) => parseCalledBall(`${event.event} ${event.detail}`)))
    .filter((ball): ball is { letter: string; number: number } => Boolean(ball))
    .filter((ball, index, list) => list.findIndex((item) => item.letter === ball.letter && item.number === ball.number) === index);
  const currentBall = allCalledBalls.at(-1) ?? null;
  const visibleCalledBalls = allCalledBalls.slice(-12);
  const currentBallKey = currentBall ? `${currentBall.letter}-${currentBall.number}` : "waiting";
  const latestSettled = history.find((entry) => entry.status === "settled" || entry.status === "rolled_over");
  const winnerWallet = round?.winnerWallet ?? latestSettled?.winnerWallet ?? null;
  const roundStatus = String(round?.status ?? "").toLowerCase();
  const roundLive = Boolean(["open", "drawing"].includes(roundStatus) && (status?.roundActive || remaining > 0 || allCalledBalls.length));
  const gameLabel = status?.currentRound ? `GAME ${String(status.currentRound).padStart(3, "0")}` : "NEXT GAME";
  const hallTitle = roundLive ? "Eyes down. Every card is live." : "Eyes down. The next draw is locking in.";
  const hallSubtitle = roundLive
    ? "ALON is calling the numbers. Find any wallet, open its book, and watch every hit land in real time."
    : "Eligible wallets are locking into the next draw. Find a wallet now and follow its cards from the first call.";

  useEffect(() => {
    if (!selected?.wallet || !status?.currentRound || serverCards[selected.wallet]) return;
    let active = true;
    const requestedCards = Math.max(1, Math.min(selected.tickets, 200));
    void protocolRequest<LiveCardsResponse>(
      `/api/bingo/cards/${encodeURIComponent(selected.wallet)}?game=${encodeURIComponent(status.currentRound)}&limit=${requestedCards}`,
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
        <h2 id={`live-hall-${variant}`}>{hallTitle}</h2>
        <p>{hallSubtitle}</p>
      </header>

      <div className="live-hall-stats" aria-label="Live bingo status">
        <div><span>GAME</span><strong>{gameLabel}</strong></div>
        <div>
          <span>{roundLive ? "TIME" : "NEXT DRAW"}</span>
          <strong>{roundLive ? remaining > 0 ? formatClock(remaining) : "LIVE" : lobbyRemaining > 0 ? formatClock(lobbyRemaining) : "LOCKING IN"}</strong>
        </div>
        <div><span>LIVE POT</span><strong>{pot && Number(pot) > 0 ? `${lamportsToSol(pot)} SOL` : "POT BUILDING"}</strong></div>
        <div><span>WALLETS</span><strong>{wallets.length ? wallets.length.toLocaleString() : "—"}</strong></div>
        <div><span>CARDS</span><strong>{totalCards ? totalCards.toLocaleString() : "—"}</strong></div>
      </div>

      <div className="live-hall-stage">
        <article className="live-caller">
          <div className="live-call-bubble">
            <span>{currentBall ? "ALON CALLS" : roundLive ? "NEXT BALL" : "ALON IS READY"}</span>
            <strong>{currentBall ? `${currentBall.letter}-${currentBall.number}` : roundLive ? "SPINNING" : "EYES DOWN"}</strong>
            <em>{currentBall ? "Check your card." : "The next number is coming."}</em>
          </div>
          <div className={`live-caller-avatar ${roundLive ? "is-live" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/alon-caller.png" alt="ALON, tonight's Bingo caller" width="400" height="400" />
          </div>
          <b>ALON · YOUR CALLER TONIGHT</b>
          <small>{roundLive ? "LIVE FROM THE ON-CHAIN HALL" : "THE NEXT BOARD IS LOCKING IN"}</small>
        </article>

        <article className="live-cage-column" aria-label="Bingo number cage">
          <div className={`live-cage-machine ${roundLive ? "is-spinning" : ""} ${currentBall ? "has-picked-ball" : ""}`} key={`cage-${currentBallKey}`}>
            <div className="live-cage-drum" aria-hidden="true">
            {cageBalls.map((ball) => {
              const { number, seed, x, y, row } = ball;
              const launchX = -76 + ((seed >>> 2) % 153);
              const launchY = -48 - ((seed >>> 9) % 72);
              const apexX = -88 + ((seed >>> 15) % 177);
              const apexY = -76 - ((seed >>> 22) % 78);
              const crossX = -68 + ((seed >>> 7) % 137);
              const crossY = -32 - ((seed >>> 17) % 66);
              const impactX = -28 + ((seed >>> 4) % 57);
              const reboundX = -22 + ((seed >>> 13) % 45);
              const reboundY = -12 - ((seed >>> 24) % 25);
              const spin = 540 + ((seed >>> 11) % 721);
              return (
                <i
                  key={number}
                  data-motion={seed % 4}
                  style={{
                    "--ball-index": number,
                    "--ball-x": `${x}%`,
                    "--ball-y": `${y}%`,
                    "--ball-launch-x": `${launchX}px`,
                    "--ball-launch-y": `${launchY}px`,
                    "--ball-launch-opposite-x": `${Math.round(launchX * -.78)}px`,
                    "--ball-launch-short-y": `${Math.round(launchY * .72)}px`,
                    "--ball-apex-x": `${apexX}px`,
                    "--ball-apex-y": `${apexY}px`,
                    "--ball-apex-opposite-x": `${Math.round(apexX * -.72)}px`,
                    "--ball-cross-x": `${crossX}px`,
                    "--ball-cross-y": `${crossY}px`,
                    "--ball-impact-x": `${impactX}px`,
                    "--ball-rebound-x": `${reboundX}px`,
                    "--ball-rebound-y": `${reboundY}px`,
                    "--ball-rebound-opposite-x": `${Math.round(reboundX * -.65)}px`,
                    "--ball-rebound-short-y": `${Math.round(reboundY * .62)}px`,
                    "--ball-spin-a": `${Math.round(spin * .24)}deg`,
                    "--ball-spin-b": `${Math.round(spin * .5)}deg`,
                    "--ball-spin-c": `${Math.round(spin * .78)}deg`,
                    "--ball-spin-d": `${Math.round(spin * .9)}deg`,
                    "--ball-spin-e": `${Math.round(spin * .96)}deg`,
                    "--ball-spin-a-reverse": `${Math.round(spin * -.24)}deg`,
                    "--ball-spin-b-reverse": `${Math.round(spin * -.5)}deg`,
                    "--ball-spin-c-reverse": `${Math.round(spin * -.78)}deg`,
                    "--ball-spin-d-reverse": `${Math.round(spin * -.9)}deg`,
                    "--ball-spin-e-reverse": `${Math.round(spin * -.96)}deg`,
                    "--ball-duration": `${.82 + ((seed >>> 18) % 89) / 100}s`,
                    "--ball-delay": `${-((seed >>> 10) % 241) / 100}s`,
                    "--ball-layer": row + 2,
                  } as CSSProperties}
                >
                  <span>{number}</span>
                </i>
              );
            })}
              <span className="live-cage-axle" aria-hidden="true" />
            </div>
            <span className="live-cage-pick-path" aria-hidden="true">
              {currentBall ? `${currentBall.letter}-${currentBall.number}` : ""}
            </span>
            <span className="live-cage-crank" aria-hidden="true" />
            <span className="live-cage-stand" aria-hidden="true" />
          </div>
          <div className={`live-ball-chute ${currentBall ? "has-ball" : ""}`} aria-hidden="true" key={`chute-${currentBallKey}`}>
            <span>{currentBall ? `${currentBall.letter}-${currentBall.number}` : ""}</span>
          </div>
          <div className={`live-current-ball ${currentBall ? "has-ball" : ""}`} aria-live="polite" key={`ball-${currentBallKey}`}>
            <span>{currentBall?.letter ?? "•"}</span>
            <strong>{currentBall?.number ?? "—"}</strong>
          </div>
          <p>CALLED THIS GAME</p>
          <div className="live-called-numbers">
            {visibleCalledBalls.length
              ? visibleCalledBalls.map((ball) => (
                  <span
                    className={ball.number === currentBall?.number ? "is-current" : ""}
                    key={`${ball.letter}-${ball.number}`}
                  >
                    {ball.letter}-{ball.number}
                  </span>
                ))
              : <small>The first call lands when the draw opens.</small>}
          </div>
          <div className="live-hall-actions">
            <strong>{roundLive ? `DRAW CLOSES · ${remaining > 0 ? formatClock(remaining) : "LIVE"}` : lobbyRemaining > 0 ? `NEXT DRAW · ${formatClock(lobbyRemaining)}` : "EYES DOWN"}</strong>
            <span>{roundLive ? "SPIN · LIVE" : "CAGE READY"}</span>
            <a href="#wallet-board">FULL BOARD</a>
          </div>
        </article>

        <article className="live-spectate-card">
          <label>
            <span>TAKE A SEAT</span>
            <strong>Find your book of cards</strong>
            <small>Paste a wallet to open every card it brought into this game.</small>
          </label>
          <div className="spectate-search-row">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedCard(0);
              }}
              placeholder="Paste wallet address"
            />
            <button type="button" onClick={() => setSelectedWallet(matchingWallets[0]?.wallet ?? "")}>FIND MY CARDS</button>
          </div>
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
                latestNumber={currentBall?.number}
              />
              {selected.tickets > 1 ? (
                <div className="spectate-card-tabs" aria-label="Select wallet card">
                  {Array.from({ length: Math.min(selected.tickets, serverCards[selected.wallet]?.length ?? selected.tickets, 50) }, (_, index) => (
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
            <div className="live-card-empty">Enter an eligible wallet to open its live book of cards.</div>
          )}
        </article>
      </div>

      <div className="wallet-card-wall" id="wallet-board">
        <header>
          <div><span>EVERY WALLET IN THE HALL</span><h3>{wallets.length ? `${wallets.length.toLocaleString()} BOOKS IN PLAY` : "YOUR PLACE ON THE BOARD"}</h3></div>
          <p>Pick a wallet. Open its book. Follow every call.</p>
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
                  latestNumber={currentBall?.number}
                />
                <span>{shortWallet(entry.wallet)}</span>
                <strong>{entry.tickets} CARD{entry.tickets === 1 ? "" : "S"}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="wallet-card-wall-empty">THE FIRST ELIGIBLE WALLETS PRINT THE OPENING BOARD.</div>
        )}
      </div>

      <div className="live-settlement-strip">
        <div><span>LAST WINNER</span><strong>{winnerWallet ? shortWallet(winnerWallet) : latestSettled ? "RESULT SETTLED" : "FIRST WINNER PENDING"}</strong></div>
        <div><span>LAST PAID</span><strong>{latestSettled && Number(latestSettled.paidLamports) > 0 ? `${lamportsToSol(latestSettled.paidLamports)} SOL` : "FIRST PAYOUT PENDING"}</strong></div>
        <div><span>FEES COLLECTED</span><strong>{pot && Number(pot) > 0 ? `${lamportsToSol(pot)} SOL` : "POT BUILDING"}</strong></div>
        <div><span>STATUS</span><strong>{roundLive ? "DRAWING LIVE" : launchState === "prelaunch" ? "HALL OPENS AT LAUNCH" : "ENTRIES LOCKING"}</strong></div>
      </div>

      <button
        className="live-hall-ca"
        type="button"
        onClick={async () => {
          if (!CA) return;
          await navigator.clipboard.writeText(CA);
          setCaCopied(true);
          window.setTimeout(() => setCaCopied(false), 1600);
        }}
      >
        {CA ? caCopied ? "CA COPIED" : `CA · ${shortWallet(CA)}` : "CA · SOON"}
      </button>
      <div className="hall-corner-controls">
        <button className="live-rules-button" type="button" onClick={() => setRulesOpen((open) => !open)} aria-label="How Bingo works">?</button>
        <button className="broadcast-chat-button" type="button" onClick={() => setChatOpen((open) => !open)}>CHAT</button>
      </div>
      {rulesOpen ? (
        <aside className="live-rules-popover" aria-label="How Bingo works">
          <header><span>HOW THE HALL WORKS</span><button type="button" onClick={() => setRulesOpen(false)} aria-label="Close rules">×</button></header>
          <ol>
            <li><b>HOLD.</b><span>Every complete {tokensPerCard.toLocaleString()} tokens prints one card.</span></li>
            <li><b>EYES DOWN.</b><span>ALON calls verifiable numbers and every card marks itself.</span></li>
            <li><b>FULL HOUSE.</b><span>The first complete card wins the funded SOL prize.</span></li>
            <li><b>PAID.</b><span>The protocol settles directly to the winning wallet.</span></li>
          </ol>
        </aside>
      ) : null}
      {chatOpen ? (
        <aside className="broadcast-chat-popover" aria-label="Live bingo chat">
          <header>
            <span>LIVE HALL CHAT</span>
            <button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat">×</button>
          </header>
          <div className="broadcast-chat-log">
            {chatMessages.length ? chatMessages.map((message) => (
              <p key={message.id}>
                <b>{message.title || "Player"}</b>
                <span>{message.detail}</span>
              </p>
            )) : <p><b>ALON</b><span>The hall is open. Eyes down for the first call.</span></p>}
          </div>
          <form onSubmit={submitChat}>
            <input value={chatName} onChange={(event) => setChatName(event.target.value)} maxLength={24} placeholder="Name (optional)" aria-label="Chat name" />
            <textarea
              value={chatDraft}
              onChange={(event) => {
                setChatDraft(event.target.value);
                if (chatStatus !== "idle") setChatStatus("idle");
              }}
              maxLength={160}
              placeholder="Say something in the hall"
              aria-label="Chat message"
            />
            <button disabled={chatBusy || !chatDraft.trim()} type="submit">
              {chatBusy ? "SENDING…" : chatStatus === "sent" ? "SENT ✓" : chatStatus === "error" ? "TRY AGAIN" : "SEND"}
            </button>
            {chatStatus === "error" ? <p className="broadcast-chat-error" role="alert">Message did not send. Try again.</p> : null}
          </form>
        </aside>
      ) : null}
    </section>
  );
}
