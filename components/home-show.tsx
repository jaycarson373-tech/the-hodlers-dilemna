"use client";

import Link from "next/link";
import { HomeSpectatorBoard } from "@/components/home-spectator-board";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";
import { WalletConnect } from "@/components/wallet-connect";

const ladder = [
  ["NEW HOLDER", "1.0×", "blue"],
  ["FIRST HOUR", "1.2×", "blue"],
  ["2 HOURS", "1.5×", "blue"],
  ["6 HOURS", "2.0×", "red"],
  ["1 DAY", "2.5×", "red"],
  ["3 DAYS", "3.0×", "red"],
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
          <span>Every 30 minutes, holders face a clean split: HOLD and let the pot roll, or SELL and fight for the fees if SELL wins.</span>
          <div className="show-hero-actions">
            <Link className="show-button show-button-red" href="/play">ENTER THE LIVE GAME</Link>
            <Link className="show-button show-button-gold" href="/rules">READ THE RULES</Link>
          </div>
        </div>

        <HomeSpectatorBoard />
      </section>

      <div className="show-ticker" aria-hidden="true">
        <div>HOLD ★ SELL ★ $DILEMMA ★ EVERY 30 MINUTES ★ THE SIGNAL FADES ★ FINAL MINUTE LOCKS ★ HOLD ★ SELL ★ $DILEMMA ★</div>
      </div>

      <section className="show-live-call" id="choice">
        <span>01 / THE DILEMMA</span>
        <h2>THE POT SPINS.<br />THE ROOM CHOOSES.</h2>
        <p>This is the holder&apos;s roulette. If SELL wins, sellers split the fee pot. If HOLD wins, nobody gets paid yet — the pot rolls forward and only holders who stayed can vote next round.</p>
        <div className="show-choice-grid">
          <article><small>YOU HOLD · HOLD WINS</small><h3>POT ROLLS</h3><p>No payout this round. Your seat survives and the next round gets bigger.</p></article>
          <article className="is-red"><small>YOU SELL · SELL WINS</small><h3>FEES PAID</h3><p>SELL players split the round&apos;s fees by eligible weight.</p></article>
          <article><small>YOU HOLD · SELL WINS</small><h3>YOU MISS THE CUT</h3><p>The SELL side takes the fees. You held conviction but the room broke.</p></article>
          <article><small>YOU SELL · HOLD WINS</small><h3>NO PAYOUT</h3><p>The room held. The pot rolls, and the next vote belongs to the wallets that held.</p></article>
        </div>
      </section>

      <section className="show-streak-section" id="streaks">
        <div><span>02 / HOLDER STREAK</span><h2>STAYING IN KEEPS YOU ON THE BOARD.</h2><p>Holding preserves your seat for the next round when HOLD wins. The longer you remain eligible, the stronger your player weight becomes.</p></div>
        <div className="show-ladder">{ladder.map(([label, value, color]) => <div className={`is-${color}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </section>

      <section className="show-boxes-section" id="survivors">
        <span>03 / HOLDER TIERS</span><h2>THE BOARD GETS SMALLER<br />WHEN HOLD WINS.</h2>
        <div className="show-tier-grid">
          <article><b>01</b><h3>PAPER HANDS</h3><p>New seat on the board. Eligible, but light.</p></article>
          <article className="is-blue"><b>02</b><h3>IRON HANDS</h3><p>Streak forming. Weight starts to matter.</p></article>
          <article className="is-red"><b>03</b><h3>DIAMOND HANDS</h3><p>Stayed through pressure. Higher weight, bigger presence.</p></article>
          <article className="is-gold"><b>04</b><h3>OBSIDIAN HANDS</h3><p>The room remembers who survived the most dilemmas.</p></article>
        </div>
      </section>

      <section className="show-banker-section">
        <div><span>04 / SIGNAL FADE</span><h2>THE ROOM GETS HARDER TO READ.</h2><p>Early in the round, the public signal can move. At 10 minutes left it starts to blur. At 5 minutes it gets harder to read. In the final minute, it fully locks until the reveal.</p><Link className="show-button show-button-red" href="/play">WATCH THE SIGNAL</Link></div>
        <div className="show-phone-card"><b>◆</b><span>ROUND TIMER</span><strong>30:00</strong><small>FINAL MINUTE LOCK</small></div>
      </section>

      <section className="show-bounty-section">
        <span>05 / SELL SIDE</span><h2>IF SELL WINS,<br />SELLERS TAKE THE FEES.</h2>
        <p>The game resolves like a pressure wheel. The side with the winning weighted result controls the round outcome.</p>
        <div className="show-bounty-grid">
          <article><b>01</b><h3>ROUND OPENS</h3><p>Eligible holders enter the board for a 30-minute spin.</p></article>
          <article><b>02</b><h3>VOTES HIDE</h3><p>The signal becomes less reliable as the timer drops.</p></article>
          <article><b>03</b><h3>SELL WINS</h3><p>SELL voters split the fees for that round.</p></article>
          <article><b>04</b><h3>HOLD WINS</h3><p>The pot rolls forward and the next board is holder-only.</p></article>
        </div>
        <Link className="show-button show-button-red" href="/play">HOLD OR SELL</Link>
      </section>

      <section className="show-how" id="how-it-works">
        <span>06 / HOW IT WORKS</span><h2>THE GAME IN FOUR MOVES.</h2>
        <div>
          <article><b>01</b><h3>CONNECT</h3><p>Connect your wallet and claim your seat if you hold enough $DILEMMA.</p></article>
          <article><b>02</b><h3>WATCH THE POT</h3><p>Every 30 minutes the current fee pot resolves into HOLD or SELL.</p></article>
          <article><b>03</b><h3>CHOOSE</h3><p>Pick HOLD to stay in, or SELL to play for the current fees.</p></article>
          <article><b>04</b><h3>REVEAL</h3><p>SELL wins pays sellers. HOLD wins rolls the pot into the next round.</p></article>
        </div>
      </section>

      <section className="show-docs-cta"><span>07 / FULL RULES</span><h2>THE SIMPLE VERSION<br />IS THE WHOLE GAME.</h2><p>Read the exact HOLD / SELL outcome flow, signal fade schedule, rollover rule, eligibility, chat, and leaderboard scoring.</p><Link className="show-button show-button-gold" href="/docs">OPEN THE DOCS</Link></section>

      <section className="show-final-call"><p>THE HOLDER&apos;S DILEMMA IS SIMPLE.</p><h2>HOLD...<br />OR SELL?</h2><Link className="show-button show-button-red" href="/play">ENTER THE LIVE GAME</Link></section>
      <footer className="show-footer"><ShowBrand /><span>Every 30 minutes. One pot. Two sides.</span><Link href="/rules">Rules</Link><Link href="/docs">Docs</Link><LaunchFooterLinks /></footer>
    </main>
  );
}
