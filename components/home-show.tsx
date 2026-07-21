"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ShowBrand } from "@/components/show-brand";
import { WalletConnect } from "@/components/wallet-connect";

const questions = [
  ["WHAT IS HAPPENING?", "Creator fees keep filling The Box. Near the end of the round, the Banker makes an offer."],
  ["WHY SHOULD I HODL?", "Every hour without selling strengthens your multiplier and your potential share."],
  ["WHAT WILL I CHOOSE?", "Take guaranteed money now—or HODL and trust the other players to open The Box."],
];

export function HomeShow() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="show-home">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="show-nav">
        <ShowBrand />
        <nav aria-label="Primary navigation">
          <Link href="/rules">The Rules</Link>
          <Link href="/play">Live Game</Link>
          <WalletConnect />
        </nav>
      </header>

      <section className="show-hero" aria-labelledby="show-home-title">
        <div className="show-spotlights" aria-hidden="true"><i /><i /></div>
        <div className="show-hero-copy">
          <p><i /> BANKER ONLINE / THE BOX IS GROWING</p>
          <h1 id="show-home-title">HODL OR<br /><em>NO HODL?</em></h1>
          <span>Every player gets the same offer. Take the guaranteed money—or trust the room and play for The Box.</span>
          <div className="show-hero-actions">
            <Link className="show-button show-button-red" href="/play">Enter Live Game</Link>
            <Link className="show-button show-button-gold" href="/rules">Learn in 60 Seconds</Link>
          </div>
        </div>

        <motion.div
          className="show-box-stage"
          animate={reduceMotion ? undefined : { y: [0, -5, 0], filter: ["brightness(1)", "brightness(1.08)", "brightness(1)"] }}
          transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
          aria-label="The mystery Box"
        >
          <div className="show-box-light" aria-hidden="true" />
          <div className="show-box"><span>?</span></div>
          <p>WHAT&apos;S IN THE BOX?</p>
          <strong>CREATOR FEES ENTER EVERY 15 MINUTES</strong>
        </motion.div>
      </section>

      <section className="show-question-grid" aria-label="The game in three questions">
        {questions.map(([title, copy], index) => (
          <article key={title}>
            <span>0{index + 1}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="show-final-call">
        <p>THE BANKER WILL CALL.</p>
        <h2>WILL YOU TAKE THE DEAL<br />OR HODL FOR THE BOX?</h2>
        <Link className="show-button show-button-red" href="/play">Take Your Seat</Link>
      </section>
    </main>
  );
}
