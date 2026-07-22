"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ShowBrand } from "@/components/show-brand";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { WalletConnect } from "@/components/wallet-connect";

const ladder = [
  ["UNDER 1 HOUR", "1.0×", "blue"], ["1 HOUR", "1.2×", "blue"],
  ["2 HOURS", "1.5×", "blue"], ["6 HOURS", "2.0×", "red"],
  ["1 DAY", "2.5×", "red"], ["3 DAYS", "3.0×", "red"], ["7 DAYS", "4.0× CAP", "gold"],
];

const faqs = [
  ["DO I HAVE TO VOTE?", "No. Silence counts as HODL. Your holding weight stays in the game."],
  ["WHAT IF I SELL?", "Selling or transferring out during an episode counts as NO HODL and resets your streak."],
  ["CAN I SEE OTHER CHOICES?", "No. Decisions stay sealed until the Reveal. The audience signal is sentiment, not the vote."],
  ["HOW DO PAYOUTS ARRIVE?", "The worker sends settled payouts directly to eligible wallets. There is no claim step."],
];

export function HomeShow() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="show-home">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="show-nav">
        <ShowBrand />
        <nav aria-label="Primary navigation">
          <a href="#choice">The Choice</a><a href="#streaks">Streaks</a><a href="#boxes">Boxes</a>
          <Link href="/play#leaderboard">Leaderboard</Link><LaunchNavLinks /><WalletConnect />
        </nav>
      </header>

      <section className="show-hero" aria-labelledby="show-home-title">
        <div className="show-spotlights" aria-hidden="true"><i /><i /></div>
        <div className="show-hero-copy">
          <p>ON-CHAIN SOCIAL EXPERIMENT / THE BANKER IS CALLING</p>
          <h1 id="show-home-title">HODL OR<br /><em>NO HODL</em></h1>
          <span>Every holder gets the call. Reject the offer and play for The Box—or take guaranteed money and walk away.</span>
          <div className="show-hero-actions">
            <Link className="show-button show-button-red" href="/play">ENTER THE LIVE GAME</Link>
            <Link className="show-button show-button-gold" href="/rules">READ THE RULES</Link>
          </div>
        </div>

        <motion.div className="show-box-stage" animate={reduceMotion ? undefined : { y: [0, -5, 0] }} transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }} aria-label="The mystery Box">
          <div className="show-box-light" aria-hidden="true" />
          <div className="show-box"><span>?</span></div>
          <div className="show-box-facts"><span>CONTESTANTS<b>HOLDERS</b></span><span>VARIABLE<b>CONVICTION</b></span><span>IN THE BOX<b>CREATOR FEES</b></span></div>
        </motion.div>
      </section>

      <div className="show-ticker" aria-hidden="true"><div>HODL ★ NO HODL ★ THE BANKER IS CALLING ★ THE BOX IS GROWING ★ EVERY 15 MINUTES ★ HODL ★ NO HODL ★ THE BANKER IS CALLING ★</div></div>

      <section className="show-live-call" id="choice">
        <span>01 / THE CHOICE</span><h2>COORDINATION HAS A PRICE.<br />SO DOES BETRAYAL.</h2>
        <p>The Banker posts a fully funded offer. Take certainty—or trust enough weighted holders to open The Box.</p>
        <div className="show-choice-grid">
          <article><small>YOU HODL · THE CROWD HOLDS</small><h3>WEIGHTED SHARE</h3><p>The Box opens. You receive your weighted share of everything left after accepted deals.</p></article>
          <article><small>YOU HODL · THE CROWD FAILS</small><h3>BOX STAYS SEALED</h3><p>No payout. Your streak survives and the unpaid balance rolls forward.</p></article>
          <article className="is-red"><small>YOU TAKE THE DEAL</small><h3>GUARANTEED OFFER</h3><p>Your posted offer is paid. Your streak resets and your multiplier returns to 1.0×.</p></article>
          <article><small>YOU SELL DURING THE EPISODE</small><h3>YOU&apos;RE OUT</h3><p>Selling counts as NO HODL. Your streak resets immediately.</p></article>
        </div>
      </section>

      <section className="show-streak-section" id="streaks">
        <div><span>02 / THE HODL STREAK</span><h2>CONVICTION COMPOUNDS.</h2><p>Your weight climbs as long as your wallet holds. Sell anything and you return to 1.0×.</p></div>
        <div className="show-ladder">{ladder.map(([label, value, color]) => <div className={`is-${color}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </section>

      <section className="show-boxes-section" id="boxes">
        <span>03 / HOLDING TIERS</span><h2>FOUR BOXES. FOUR LEVELS<br />OF CONVICTION.</h2>
        <div className="show-tier-grid">
          <article><b>01</b><h3>PAPER HANDS</h3><p>Early-stage holder. Your seat is on the board.</p></article>
          <article className="is-blue"><b>02</b><h3>IRON HANDS</h3><p>Conviction is forming and your weight is growing.</p></article>
          <article className="is-red"><b>03</b><h3>DIAMOND HANDS</h3><p>Longer holding earns a stronger multiplier.</p></article>
          <article className="is-gold"><b>04</b><h3>OBSIDIAN HANDS</h3><p>The highest tier: seven days held and a 4.0× cap.</p></article>
        </div>
      </section>

      <section className="show-banker-section">
        <div><span>04 / THE BANKER&apos;S OFFER</span><h2>THE PHONE WILL RING.</h2><p>Every episode ends with the same question. Take your exact funded offer—or HODL for what remains inside The Box.</p><Link className="show-button show-button-red" href="/play">ANSWER THE CALL</Link></div>
        <div className="show-phone-card"><b>☎</b><span>DECISION WINDOW</span><strong>15:00</strong><small>CHOICES STAY SEALED</small></div>
      </section>

      <section className="show-how" id="how-it-works">
        <span>05 / HOW IT WORKS</span><h2>THE GAME IN FOUR MOVES.</h2>
        <div><article><b>01</b><h3>CONNECT</h3><p>Open your Box and see your balance, multiplier, offer, and projected payout.</p></article><article><b>02</b><h3>WATCH THE BOX</h3><p>Creator fees keep adding to the live prize every 15 minutes.</p></article><article><b>03</b><h3>MAKE THE CALL</h3><p>HODL for the Box or take your guaranteed Banker offer.</p></article><article><b>04</b><h3>THE REVEAL</h3><p>Choices unlock together. Payouts go directly to eligible wallets.</p></article></div>
      </section>

      <section className="show-faq">
        <span>06 / FAQ</span><h2>BEFORE THE PHONE RINGS.</h2>
        <div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<i>+</i></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="show-final-call"><p>EVERY HOLDER EVENTUALLY FACES THE BANKER.</p><h2>HODL...<br />OR NO HODL?</h2><Link className="show-button show-button-red" href="/play">ENTER THE LIVE GAME</Link></section>
      <footer className="show-footer"><ShowBrand /><span>Every 15 minutes. One funded offer. One sealed decision.</span><Link href="/rules">Rules</Link><LaunchFooterLinks /></footer>
    </main>
  );
}
