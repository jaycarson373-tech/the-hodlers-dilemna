"use client";

import Link from "next/link";
import { FooterBanner } from "@/components/footer-banner";
import { HomeSpectatorBoard } from "@/components/home-spectator-board";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { PublicLeaderboardBoard } from "@/components/public-leaderboard-board";
import { RoundHistoryBoard } from "@/components/round-history-board";
import { ShowBrand } from "@/components/show-brand";
import { WalletConnect } from "@/components/wallet-connect";

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
          <p>FAST SOLANA BINGO / $DILEMMA</p>
          <h1 id="show-home-title">ON-CHAIN<br /><em>BINGO</em></h1>
          <span>Every 1M tokens becomes a live ticket on the board.</span>
          <div className="show-hero-actions">
            <Link className="show-button show-button-green" href="/play">ENTER THE BOARD</Link>
            <Link className="show-button show-button-red" href="/rules">HOW IT WORKS</Link>
          </div>
        </div>
      </section>

      <div className="show-ticker" aria-hidden="true">
        <div>1M TOKENS = 1 TICKET ★ CREATOR FEES FUND THE DRAW ★ 80% MAIN BOARD ★ 20% JACKPOT ★ EVERY ROUND REVEALS A CARD ★</div>
      </div>

      <section className="home-live-section" id="live-round">
        <HomeSpectatorBoard />
      </section>

      <section className="show-live-call" id="choice">
        <span>01 / THE BOARD</span>
        <h2>EVERY WALLET<br />GETS A CARD.</h2>
        <p>Your wallet balance becomes tickets. One million tokens equals one bingo card on the live board.</p>
        <div className="show-choice-grid">
          <article className="is-hold">
            <small>PLAYER CARD</small>
            <h3>1M = 1</h3>
            <p>Every full million $DILEMMA adds another card to your wallet entry.</p>
          </article>
          <article className="is-red">
            <small>LIVE DRAW</small>
            <h3>SPIN</h3>
            <p>A live draw rolls through the holder cards until the winning wallet is revealed.</p>
          </article>
        </div>
        <div className="sell-override-callout"><span>JACKPOT MODE</span><strong>ONE IN 25 ROUNDS.</strong><p>Most fees fund the active board. A separate jackpot pool builds for rare bonus spins after a winner is drawn.</p></div>
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
