"use client";

import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { PublicLeaderboardBoard } from "@/components/public-leaderboard-board";
import { RoundHistoryBoard } from "@/components/round-history-board";
import { ShowBrand } from "@/components/show-brand";
import { PUMP_FUN_URL, TICKER } from "@/lib/constants";

const bingoRows = [
  [5, 25, 44, 58, 75],
  [6, 24, 33, 53, 68],
  [11, 16, "◆", 60, 69],
  [9, 29, 32, 59, 74],
  [8, 17, 41, 57, 71],
] as const;

function BingoCardPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bingo-fun-card ${compact ? "is-compact" : ""}`} aria-label="Sample bingo card">
      <div className="bingo-fun-card-head">{["B", "I", "N", "G", "O"].map((letter) => <b key={letter}>{letter}</b>)}</div>
      <div className="bingo-fun-card-grid">
        {bingoRows.flatMap((row, rowIndex) => row.map((value, cellIndex) => (
          <span className={value === "◆" || value === 59 || value === 17 ? "is-daubed" : ""} key={`${rowIndex}-${cellIndex}`}>
            {value}
          </span>
        )))}
      </div>
      <p>CARD #001 · WALLET ENTRY</p>
    </div>
  );
}

export function HomeShow({ launchState }: { launchState: "prelaunch" | "live" }) {
  return (
    <main className="show-home">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="show-nav">
        <ShowBrand />
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How It Works</a>
          <a href="#choice">Entries</a>
          <a href="#live-round">Live Hall</a>
          <a href="#leaderboard">Winners</a>
          <LaunchNavLinks />
        </nav>
      </header>

      <section className="show-hero" aria-labelledby="show-home-title">
        <div className="show-spotlights" aria-hidden="true"><i /><i /></div>
        <div className="show-hero-copy">
          <p>OLD SCHOOL · ON-CHAIN · ON PUMP.FUN</p>
          <h1 id="show-home-title">EYES DOWN.<br /><em>FEES UP.</em></h1>
          <span>Solana bingo with real stakes. Every 1,000,000 {TICKER} prints one card. ALON calls the numbers live. The winning wallet takes the creator-fee prize in SOL.</span>
          <div className="show-hero-actions">
            {PUMP_FUN_URL ? (
              <a className="show-button show-button-green" href={PUMP_FUN_URL} target="_blank" rel="noreferrer">BUY {TICKER}</a>
            ) : (
              <span className="show-button show-button-green is-disabled">CA SOON</span>
            )}
            <Link className="show-button show-button-red" href="/play">ENTER BINGO</Link>
            <Link className="show-button show-button-red" href="/rules">HOW IT WORKS</Link>
          </div>
        </div>
        <div className="bingo-hero-card-wrap">
          <BingoCardPreview />
        </div>
      </section>

      <div className="show-ticker" aria-hidden="true">
        <div>1M TOKENS = 1 TICKET ★ CREATOR FEES FUND THE DRAW ★ 80% MAIN BOARD ★ 20% JACKPOT ★ EVERY ROUND REVEALS A CARD ★</div>
      </div>

      <section className="bingo-how-section" id="how-it-works">
        <span>HOW IT WORKS</span>
        <h2>Three steps between<br />you and the pot.</h2>
        <p>Your wallet is your book of cards. Hold more {TICKER}, enter more cards, and watch every call land live.</p>
        <div>
          <article><b>▣</b><small>STEP 01 — HOLD</small><h3>Your bag prints the cards</h3><p>Every complete 1,000,000-token block enters one card in the next draw.</p></article>
          <article><b>◉</b><small>STEP 02 — EYES DOWN</small><h3>ALON calls it live</h3><p>The cage spins, numbers drop, and every eligible card marks itself in real time.</p></article>
          <article><b>♛</b><small>STEP 03 — FULL HOUSE</small><h3>Bingo pays in SOL</h3><p>The winning wallet receives the funded prize automatically. No claim screen.</p></article>
        </div>
      </section>

      <section className="show-live-call" id="choice">
        <span>ENTRIES</span>
        <h2>Your bag is your<br />book of cards.</h2>
        <div className="bingo-entry-layout">
          <div className="bingo-entry-table" aria-label="Entries per game">
            <div><b>{TICKER} HELD</b><b>ENTRIES PER GAME</b></div>
            {[
              ["1,000,000", "1 card"],
              ["5,000,000", "5 cards"],
              ["10,000,000", "10 cards"],
              ["50,000,000", "50 cards"],
              ["Above 5% supply", "not eligible"],
            ].map(([held, entries]) => <div key={held}><span>{held}</span><strong>{entries}</strong></div>)}
          </div>
          <div className="bingo-copy-block">
            <h3>Simple maths, no small print.</h3>
            <p>At the game snapshot, every complete 1,000,000 {TICKER} prints one live card, capped at 50 cards per eligible wallet.</p>
            <p>More cards mean more ways to hit a full house when ALON starts calling.</p>
            <blockquote>No staking. No manual entry. Hold the tokens and your cards take their seats.</blockquote>
          </div>
        </div>
      </section>

      <section className="bingo-pot-section" id="the-pot">
        <span>THE POT</span>
        <h2>Creator fees in.<br />One winner out.</h2>
        <p>Creator fees fund every draw. When a card hits, the protocol settles the prize directly to its wallet in SOL.</p>
        <div>
          <article><strong>80%</strong><b>MAIN DRAW</b><p>Goes into the live winner prize.</p></article>
          <article><strong>20%</strong><b>JACKPOT</b><p>Builds the one-in-25 bonus reserve.</p></article>
          <article><strong>1M</strong><b>TOKENS PER CARD</b><p>One more block. One more card.</p></article>
          <article><strong>1</strong><b>WINNER</b><p>One full house. One automatic SOL payout.</p></article>
        </div>
      </section>

      <section className="home-leaderboard-section" id="leaderboard">
        <PublicLeaderboardBoard limit={10} />
      </section>

      <section id="history">
        <RoundHistoryBoard />
      </section>

      <section className="show-final-call"><p>THE CAGE NEVER STAYS QUIET.</p><h2>WILL YOUR<br />CARD HIT?</h2><Link className="show-button show-button-green" href="/play">WATCH THE NEXT DRAW</Link></section>
      <div className="bingo-brand-banner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bingo-banner.jpg" alt="Bingo.fun" width="1600" height="532" loading="lazy" />
      </div>
      <footer className="show-footer"><ShowBrand /><span>Eyes down. Fees up.</span><Link href="/rules">How It Works</Link><Link href="/leaderboard">Winners</Link><LaunchFooterLinks /></footer>
    </main>
  );
}
