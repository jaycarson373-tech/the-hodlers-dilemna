"use client";

import Link from "next/link";
import { FooterBanner } from "@/components/footer-banner";
import { HomeSpectatorBoard } from "@/components/home-spectator-board";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { PublicLeaderboardBoard } from "@/components/public-leaderboard-board";
import { RoundHistoryBoard } from "@/components/round-history-board";
import { ShowBrand } from "@/components/show-brand";
import { WalletConnect } from "@/components/wallet-connect";

const bingoRows = [
  [5, 25, 44, 58, 75],
  [6, 24, 33, 53, 68],
  [11, 16, "◆", 60, 69],
  [9, 29, 32, 59, 74],
  [8, 17, 41, 57, 71],
] as const;

const calledNumbers = [59, 4, 17, 72, 43, 31, 65, 3, 45, 56, 28];

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

export function HomeShow() {
  return (
    <main className="show-home">
      <div className="supplied-market-backdrop" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holders-dilemma-market-bg.jpg" alt="" decoding="async" fetchPriority="high" />
      </div>
      <div className="show-bulbs" aria-hidden="true" />
      <header className="show-nav">
        <ShowBrand />
        <nav aria-label="Primary navigation">
          <a href="#live-round">Live Round</a>
          <a href="#choice">Tickets</a>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#history">History</a>
          <Link href="/docs">Docs</Link>
          <LaunchNavLinks />
          <WalletConnect />
        </nav>
      </header>

      <section className="show-hero" aria-labelledby="show-home-title">
        <div className="show-spotlights" aria-hidden="true"><i /><i /></div>
        <div className="show-hero-copy">
          <p>OLD SCHOOL · ON-CHAIN · ON PUMP.FUN</p>
          <h1 id="show-home-title">EYES DOWN.<br /><em>FEES UP.</em></h1>
          <span>The classic hall game rebuilt on Solana. Hold $DILEMMA to get your cards — every 1,000,000 tokens is one entry. Numbers get drawn, wallets hit bingo, and creator fees become the prize.</span>
          <div className="show-hero-actions">
            <Link className="show-button show-button-green" href="/play">BUY $DILEMMA</Link>
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

      <section className="home-live-section" id="live-round">
        <HomeSpectatorBoard />
      </section>

      <section className="show-live-call" id="choice">
        <span>ENTRIES</span>
        <h2>Your bag is your<br />book of cards.</h2>
        <div className="bingo-entry-layout">
          <div className="bingo-entry-table" aria-label="Entries per game">
            <div><b>$DILEMMA HELD</b><b>ENTRIES PER GAME</b></div>
            {[
              ["1,000,000", "1 card"],
              ["5,000,000", "5 cards"],
              ["10,000,000", "10 cards"],
              ["50,000,000", "50 cards"],
              ["100,000,000", "100 cards"],
            ].map(([held, entries]) => <div key={held}><span>{held}</span><strong>{entries}</strong></div>)}
          </div>
          <div className="bingo-copy-block">
            <h3>Simple maths, no small print.</h3>
            <p>One entry per 1,000,000 $DILEMMA. A snapshot is taken at the start of each game — whatever is in your wallet at that moment is how many cards you&apos;re playing.</p>
            <p>Sell before the snapshot and you&apos;re playing fewer cards. Hold through it and every game is another free shot at the pot.</p>
            <blockquote>Every game is free to enter for holders. The house doesn&apos;t win here — the winner does.</blockquote>
          </div>
        </div>
      </section>

      <section className="bingo-how-section" id="how-it-works">
        <span>HOW IT WORKS</span>
        <h2>Three steps between<br />you and the pot.</h2>
        <p>No tickets, no dabbers, no draughty community hall. Your wallet is your book of cards — the more $DILEMMA you hold, the more cards you play every single game.</p>
        <div>
          <article><b>▣</b><small>STEP 01 — HOLD</small><h3>Buy and hold $DILEMMA</h3><p>Every 1,000,000 tokens in your wallet at the game snapshot equals one entry. No staking, no claiming — just hold.</p></article>
          <article><b>◉</b><small>STEP 02 — THE DRAW</small><h3>The cage spins</h3><p>Numbers are called live and matched against holder cards automatically. Eyes down, the chain handles the rest.</p></article>
          <article><b>♛</b><small>STEP 03 — HOUSE</small><h3>Winner takes the fees</h3><p>Creator fees from the game period become the prize. First wallet to complete the card gets paid straight to their wallet.</p></article>
        </div>
      </section>

      <section className="bingo-caller-section">
        <div className="bingo-caller-profile">
          <div className="bingo-call-bubble"><span>Garden gate...</span><strong>I-28</strong></div>
          <div className="bingo-avatar-placeholder"><span>3D<br />CALLER</span></div>
          <b>YOUR CALLER TONIGHT</b>
          <small>Avatar reveal coming soon</small>
        </div>
        <div className="bingo-cage">
          <div className="bingo-cage-orb"><span>●</span><span>●</span><span>●</span><span>●</span></div>
          <div className="bingo-ball">I<br /><strong>28</strong></div>
          <p>CALLED THIS GAME</p>
          <div>{calledNumbers.map((number) => <span className={number === 28 ? "is-current" : ""} key={number}>{number}</span>)}</div>
        </div>
        <div className="bingo-live-card-side">
          <p>YOUR CARD · 4,000,000 $DILEMMA = 4 ENTRIES</p>
          <BingoCardPreview compact />
        </div>
      </section>

      <section className="home-leaderboard-section" id="leaderboard">
        <PublicLeaderboardBoard limit={10} />
      </section>

      <section id="history">
        <RoundHistoryBoard />
      </section>

      <section className="show-final-call"><p>THE BOARD IS LIVE.</p><h2>FIND YOUR<br />CARD.</h2><Link className="show-button show-button-green" href="/play">ENTER BINGO</Link></section>
      <footer className="show-footer"><ShowBrand /><span>Fast rounds. Holder cards. Creator-fee prizes.</span><Link href="/rules">Rules</Link><Link href="/docs">Docs</Link><LaunchFooterLinks /></footer>
      <FooterBanner />
    </main>
  );
}
