"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { HomeProtocolStats } from "@/components/home-protocol-stats";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { PublicLeaderboardBoard } from "@/components/public-leaderboard-board";
import { RoundHistoryBoard } from "@/components/round-history-board";
import { ShowBrand } from "@/components/show-brand";
import { PUMP_FUN_URL, TICKER } from "@/lib/constants";

const bingoRows = [
  [4, 23, 39, 54, 67],
  [9, 27, 41, 48, 73],
  [13, 18, "◆", 57, 64],
  [2, 30, 36, 52, 71],
  [15, 21, 45, 60, 69],
] as const;

function RoyalCard() {
  return (
    <div className="royal-card" aria-label="Example royal bingo card">
      <div className="royal-card-head">{["B", "I", "N", "G", "O"].map((letter) => <b key={letter}>{letter}</b>)}</div>
      <div className="royal-card-grid">
        {bingoRows.flatMap((row, rowIndex) => row.map((value, cellIndex) => (
          <span className={value === "◆" || value === 57 || value === 21 ? "is-called" : ""} key={`${rowIndex}-${cellIndex}`}>{value}</span>
        )))}
      </div>
      <p>ROYAL CARD 001 · LIVE ENTRY</p>
    </div>
  );
}

export function HomeShow({ launchState }: { launchState: "prelaunch" | "live" }) {
  void launchState;
  const [walletQuery, setWalletQuery] = useState("");

  const findCards = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const wallet = walletQuery.trim();
    if (wallet) window.location.assign(`/play?wallet=${encodeURIComponent(wallet)}`);
  };

  return (
    <main className="show-home royal-home">
      <header className="show-nav royal-nav">
        <ShowBrand />
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">The Draw</a>
          <a href="#entries">Cards</a>
          <a href="#leaderboard">Royal Table</a>
          <LaunchNavLinks />
          <Link className="show-nav-buy show-live-cta" href="/play"><i aria-hidden="true" /><span>ENTER THE HALL</span></Link>
        </nav>
      </header>

      <section className="royal-hero" aria-labelledby="royal-title">
        <div className="royal-hero-art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/royal-bingo-banner.png" alt="" width="2172" height="724" />
        </div>
        <div className="royal-hero-copy">
          <p>LIVE ON SOLANA · FUNDED BY CREATOR FEES</p>
          <h1 id="royal-title">ENTER THE<br /><em>BLUE HALL.</em></h1>
          <span>Every 2,000,000 {TICKER} deals one card. Every number is called live. The first full house takes the funded SOL prize.</span>
          <div className="royal-hero-actions">
            <Link className="royal-primary show-live-cta" href="/play"><i aria-hidden="true" />ENTER BINGO</Link>
            {PUMP_FUN_URL ? <a className="royal-secondary" href={PUMP_FUN_URL} target="_blank" rel="noreferrer">GET {TICKER}</a> : null}
          </div>
          <form className="royal-wallet-search" onSubmit={findCards}>
            <input aria-label="Find cards by wallet" onChange={(event) => setWalletQuery(event.target.value)} placeholder="PASTE A WALLET TO FIND ITS CARDS" value={walletQuery} />
            <button disabled={!walletQuery.trim()} type="submit">SEARCH THE HALL</button>
          </form>
        </div>
        <div className="royal-hero-card"><RoyalCard /></div>
      </section>

      <div className="royal-ledger-strip">
        <span>2,000,000 {TICKER} = 1 CARD</span><span>80% MAIN PRIZE</span><span>20% ROYAL JACKPOT</span><span>50-CARD WALLET CAP</span>
      </div>
      <HomeProtocolStats />

      <section className="royal-process" id="how-it-works">
        <header><span>THE DRAW</span><h2>Hold. Watch.<br />Hear your number.</h2><p>No tickets to buy and nothing to claim. Your balance writes the cards; the protocol handles the rest.</p></header>
        <div>
          <article><small>01 / DEAL</small><b>2M</b><h3>Your balance becomes cards.</h3><p>Every complete two-million-token block at the snapshot deals one card into the live hall.</p></article>
          <article><small>02 / CALL</small><b>75</b><h3>The royal drum decides.</h3><p>Numbered balls tumble, one call lands, and every active card marks itself automatically.</p></article>
          <article><small>03 / CROWN</small><b>1</b><h3>First full house wins.</h3><p>The draw closes the moment a card completes. The funded prize settles directly in SOL.</p></article>
        </div>
      </section>

      <section className="royal-entries" id="entries">
        <div><span>YOUR BOOK</span><h2>More balance.<br />More chances.</h2><p>A wallet can enter up to 50 cards. Wallets above 5% of supply are excluded from the draw.</p></div>
        <div className="royal-entry-table">
          <div><b>{TICKER} HELD</b><b>CARDS DEALT</b></div>
          {[["2,000,000", "1"], ["10,000,000", "5"], ["20,000,000", "10"], ["100,000,000", "50"], ["Above 5% supply", "INELIGIBLE"]].map(([held, cards]) => <div key={held}><span>{held}</span><strong>{cards}</strong></div>)}
        </div>
      </section>

      <section className="royal-economy">
        <header><span>THE TREASURY</span><h2>Every fee strengthens the draw.</h2></header>
        <div>
          <article><strong>80%</strong><h3>LIVE PRIZE</h3><p>Reserved for the winning card.</p></article>
          <article><strong>20%</strong><h3>ROYAL JACKPOT</h3><p>Compounds until its bonus roll hits.</p></article>
          <article><strong>1 / 25</strong><h3>JACKPOT ROLL</h3><p>A verifiable bonus decision after a win.</p></article>
        </div>
      </section>

      <section className="home-leaderboard-section royal-board" id="leaderboard"><PublicLeaderboardBoard limit={10} /></section>
      <section className="royal-history" id="history"><RoundHistoryBoard /></section>

      <section className="royal-final">
        <div><span>THE NEXT NUMBER COULD BE YOURS.</span><h2>TAKE YOUR<br />SEAT.</h2><Link className="royal-primary" href="/play">ENTER THE LIVE HALL</Link></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/royal-bingo-banner.png" alt="Bingo Pump royal blue live hall" width="2172" height="724" loading="lazy" />
      </section>
      <footer className="show-footer royal-footer"><ShowBrand /><span>THE BLUE HALL · ON-CHAIN BINGO</span><a href="#how-it-works">The Draw</a><Link href="/leaderboard">Royal Table</Link><LaunchFooterLinks /></footer>
    </main>
  );
}
