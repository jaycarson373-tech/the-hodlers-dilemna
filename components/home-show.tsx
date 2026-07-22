"use client";

import Link from "next/link";
import { HomeSpectatorBoard } from "@/components/home-spectator-board";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { RoundHistoryBoard } from "@/components/round-history-board";
import { ShowBrand } from "@/components/show-brand";
import { WalletConnect } from "@/components/wallet-connect";

const ladder = [
  ["NEW HOLDER", "BASE WEIGHT", "blue"],
  ["FIRST HOUR", "+20% BOOST", "blue"],
  ["2 HOURS", "+50% BOOST", "blue"],
  ["6 HOURS", "2.0× WEIGHT", "red"],
  ["1 DAY", "2.5× WEIGHT", "red"],
  ["3 DAYS", "3.0× WEIGHT", "red"],
  ["7 DAYS", "4.0× CAP", "gold"],
];

export function HomeShow() {
  return (
    <main className="show-home">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="show-nav">
        <ShowBrand />
        <nav aria-label="Primary navigation">
          <a href="#choice">The Dilemma</a>
          <a href="#streaks">Streaks</a>
          <a href="#survivors">Survivors</a>
          <Link href="/docs">Docs</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <LaunchNavLinks />
          <WalletConnect />
        </nav>
      </header>

      <section className="show-hero" aria-labelledby="show-home-title">
        <div className="show-spotlights" aria-hidden="true"><i /><i /></div>
        <div className="show-hero-copy">
          <p>ON-CHAIN HOLDER GAME / $DILEMMA</p>
          <h1 id="show-home-title">HOLDERS<br /><em>DILEMMA</em></h1>
          <span>Every 15 minutes, holders face the split: HOLD to keep the pot alive, or JEET and fight for the fees if JEET wins.</span>
          <div className="show-hero-actions">
            <Link className="show-button show-button-red" href="/play">ENTER THE LIVE GAME</Link>
            <Link className="show-button show-button-gold" href="/rules">READ THE RULES</Link>
          </div>
        </div>

        <HomeSpectatorBoard />
      </section>

      <div className="show-ticker" aria-hidden="true">
        <div>HOLD ★ JEET ★ $DILEMMA ★ EVERY 15 MINUTES ★ SIGNAL BLURS AFTER 10 ★ FINAL MINUTE LOCKS ★ HOLD ★ JEET ★ $DILEMMA ★</div>
      </div>

      <RoundHistoryBoard />

      <section className="show-live-call" id="choice">
        <span>01 / THE DILEMMA</span>
        <h2>THE POT SPINS.<br />THE ROOM CHOOSES.</h2>
        <p>This is holder roulette. If JEET wins, jeeters split the fee pot by holding weight. If HOLD wins, nobody gets paid yet — the pot rolls forward and only holders who stayed can vote next round.</p>
        <div className="show-choice-grid">
          <article><small>YOU HOLD · HOLD WINS</small><h3>POT ROLLS</h3><p>No payout this round. Your seat survives and the next round gets bigger.</p></article>
          <article className="is-red"><small>YOU JEET · JEET WINS</small><h3>FEES PAID</h3><p>JEET players split the round&apos;s fees by holding weight.</p></article>
          <article><small>YOU HOLD · JEET WINS</small><h3>YOU MISS THE CUT</h3><p>The JEET side takes the fees. You held conviction but the room broke.</p></article>
          <article><small>YOU JEET · HOLD WINS</small><h3>NO PAYOUT</h3><p>The room held. The pot rolls, and the next vote belongs to the wallets that held.</p></article>
        </div>
      </section>

      <section className="show-streak-section" id="streaks">
        <div><span>02 / HOLDING WEIGHT</span><h2>YOUR BAG SETS THE BASE.</h2><p>Payouts start with how much $DILEMMA you hold. Time held adds a rolling boost to winnings and airdrops, but the game is still weight-first.</p></div>
        <div className="show-ladder">{ladder.map(([label, value, color]) => <div className={`is-${color}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </section>

      <section className="show-boxes-section" id="survivors">
        <span>03 / HOLDER TIERS</span><h2>THE BOARD GETS SMALLER<br />WHEN HOLD WINS.</h2>
        <div className="show-tier-grid">
          <article><b>01</b><h3>PAPER HANDS</h3><p>New seat on the board. Eligible, but base weight only.</p></article>
          <article className="is-blue"><b>02</b><h3>IRON HANDS</h3><p>Holding time starts adding force to the bag.</p></article>
          <article className="is-red"><b>03</b><h3>DIAMOND HANDS</h3><p>Stayed through pressure. More weight in payouts and airdrops.</p></article>
          <article className="is-gold"><b>04</b><h3>OBSIDIAN HANDS</h3><p>The largest time-held boost for wallets that keep surviving.</p></article>
        </div>
      </section>

      <section className="show-banker-section">
        <div><span>04 / SIGNAL FADE</span><h2>THE ROOM GETS HARDER TO READ.</h2><p>The first 10 minutes can show the public signal. With 4 minutes left it becomes heavily obfuscated. In the final minute, it fully locks until the reveal.</p><Link className="show-button show-button-red" href="/play">WATCH THE SIGNAL</Link></div>
        <div className="show-phone-card"><b>◆</b><span>ROUND TIMER</span><strong>15:00</strong><small>FINAL MINUTE LOCK</small></div>
      </section>

      <section className="show-bounty-section">
        <span>05 / JEET SIDE</span><h2>IF JEET WINS,<br />JEETERS TAKE THE FEES.</h2>
        <p>The game resolves like a pressure wheel. The side with the winning weighted result controls the round outcome.</p>
        <div className="show-bounty-grid">
          <article><b>01</b><h3>ROUND OPENS</h3><p>Eligible holders enter the board for a 15-minute spin.</p></article>
          <article><b>02</b><h3>VOTES HIDE</h3><p>The signal becomes less reliable as the timer drops.</p></article>
          <article><b>03</b><h3>JEET WINS</h3><p>JEET voters split the fees for that round.</p></article>
          <article><b>04</b><h3>HOLD WINS</h3><p>The pot rolls forward and the next board is holder-only.</p></article>
        </div>
        <Link className="show-button show-button-red" href="/play">HOLD OR JEET</Link>
      </section>

      <section className="show-how" id="how-it-works">
        <span>06 / HOW IT WORKS</span><h2>THE GAME IN FOUR MOVES.</h2>
        <div>
          <article><b>01</b><h3>CONNECT</h3><p>Connect your wallet and claim your seat if you hold enough $DILEMMA.</p></article>
          <article><b>02</b><h3>WATCH THE POT</h3><p>Every 15 minutes the current fee pot resolves into HOLD or JEET.</p></article>
          <article><b>03</b><h3>CHOOSE</h3><p>Pick HOLD to stay in, or JEET to play for the current fees.</p></article>
          <article><b>04</b><h3>REVEAL</h3><p>JEET wins pays jeeters. HOLD wins rolls the pot into the next round.</p></article>
        </div>
      </section>

      <section className="show-docs-cta"><span>07 / FULL RULES</span><h2>THE SIMPLE VERSION<br />IS THE WHOLE GAME.</h2><p>Read the exact HOLD / JEET outcome flow, signal fade schedule, rollover rule, eligibility, chat, and leaderboard scoring.</p><Link className="show-button show-button-gold" href="/docs">OPEN THE DOCS</Link></section>

      <section className="show-final-call"><p>THE HOLDER&apos;S DILEMMA IS SIMPLE.</p><h2>HOLD...<br />OR JEET?</h2><Link className="show-button show-button-red" href="/play">ENTER THE LIVE GAME</Link></section>
      <footer className="show-footer"><ShowBrand /><span>Every 15 minutes. One pot. Two sides.</span><Link href="/rules">Rules</Link><Link href="/docs">Docs</Link><LaunchFooterLinks /></footer>
    </main>
  );
}
