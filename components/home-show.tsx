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
          <a href="#choice">Decision</a>
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
          <p>ON-CHAIN HOLDER GAME / $DILEMMA</p>
          <h1 id="show-home-title">HOLDERS<br /><em>DILEMMA</em></h1>
          <span>Every holder eventually chooses.</span>
          <div className="show-hero-actions">
            <Link className="show-button show-button-green" href="/play">TAKE THE GREEN PILL</Link>
            <Link className="show-button show-button-red" href="/play">TAKE THE RED PILL</Link>
          </div>
        </div>
      </section>

      <div className="show-ticker" aria-hidden="true">
        <div>GREEN = HOLD ★ RED = JEET ★ THE PROTOCOL REMEMBERS ★ EVERY ROUND REVEALS WHO STAYED ★ GREEN = HOLD ★ RED = JEET ★</div>
      </div>

      <section className="home-live-section" id="live-round">
        <HomeSpectatorBoard />
      </section>

      <section className="show-live-call" id="choice">
        <span>01 / THE DECISION</span>
        <h2>ONE ROOM.<br />TWO PILLS.</h2>
        <p>The protocol remembers your last choice. Sell once and the chain marks you JEET.</p>
        <div className="show-choice-grid">
          <article className="is-hold">
            <small>GREEN PILL</small>
            <h3>HOLD</h3>
            <p>Stay in. Let the pot roll. Survive to the next board.</p>
          </article>
          <article className="is-red">
            <small>RED PILL</small>
            <h3>JEET</h3>
            <p>Break. Fight for the fees. Reveal who folded.</p>
          </article>
        </div>
        <div className="sell-override-callout"><span>SELL OVERRIDE</span><strong>SELL ONCE = JEET.</strong><p>If you vote HOLD but sell before the reveal, your vote is automatically overridden to JEET.</p></div>
      </section>

      <section className="home-leaderboard-section" id="leaderboard">
        <PublicLeaderboardBoard limit={10} />
      </section>

      <section id="history">
        <RoundHistoryBoard />
      </section>

      <section className="show-final-call"><p>THE EXPERIMENT IS LIVE.</p><h2>GREEN...<br />OR RED?</h2><Link className="show-button show-button-green" href="/play">ENTER THE DILEMMA</Link></section>
      <footer className="show-footer"><ShowBrand /><span>Every 15 minutes. One pot. Two sides.</span><Link href="/rules">Rules</Link><Link href="/docs">Docs</Link><LaunchFooterLinks /></footer>
      <FooterBanner />
    </main>
  );
}
