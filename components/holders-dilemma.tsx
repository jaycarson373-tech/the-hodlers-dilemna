"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/section-heading";
import { WalletConnect } from "@/components/wallet-connect";
import {
  feed,
  leaderboard,
  mechanics,
  outcomes,
  streakSteps,
  tiers,
} from "@/lib/experiment-data";

type Decision = "cooperate" | "defect" | null;

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SignalBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "cooperate" | "defect";
}) {
  return (
    <div className="signal-row">
      <div className="signal-label">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="signal-track" aria-hidden="true">
        <motion.div
          className={`signal-fill ${tone}`}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function ExperimentPanel({
  seconds,
  pot,
  cooperateSignal,
  decision,
  onDecision,
}: {
  seconds: number;
  pot: number;
  cooperateSignal: number;
  decision: Decision;
  onDecision: (decision: Exclude<Decision, null>) => void;
}) {
  return (
    <div className="experiment-panel terminal-frame">
      <div className="corner corner-tl" aria-hidden="true" />
      <div className="corner corner-br" aria-hidden="true" />
      <div className="panel-topline">
        <span>ROUND 024</span>
        <span className="live-status"><i /> DECISION WINDOW OPEN</span>
      </div>

      <div className="pot-readout">
        <p>FEE POT / ILLUSTRATIVE</p>
        <strong>{pot.toFixed(2)} <small>SOL</small></strong>
      </div>

      <div className="timer-readout">
        <span>TIME REMAINING</span>
        <span>{formatTime(seconds)}</span>
      </div>

      <div className="signal-box">
        <div className="signal-heading">
          <span>NON-BINDING PUBLIC SIGNALS</span>
          <span>SIMULATED PREVIEW</span>
        </div>
        <SignalBar label="COOPERATE" value={cooperateSignal} tone="cooperate" />
        <SignalBar label="DEFECT" value={100 - cooperateSignal} tone="defect" />
      </div>

      <div className="decision-grid" aria-label="Decision demonstration">
        <button
          type="button"
          className={`decision-button cooperate ${decision === "cooperate" ? "selected" : ""}`}
          aria-pressed={decision === "cooperate"}
          onClick={() => onDecision("cooperate")}
        >
          <span className="decision-number">01</span>
          <strong>COOPERATE</strong>
          <small>Protect the collective distribution.</small>
        </button>
        <button
          type="button"
          className={`decision-button defect ${decision === "defect" ? "selected" : ""}`}
          aria-pressed={decision === "defect"}
          onClick={() => onDecision("defect")}
        >
          <span className="decision-number">02</span>
          <strong>DEFECT</strong>
          <small>Risk the round for a larger individual share.</small>
        </button>
      </div>

      <p className="panel-footnote" role="status" aria-live="polite">
        {decision
          ? `${decision.toUpperCase()} selected for local preview. No transaction was created.`
          : "Demonstration controls only. No wallet or blockchain connection."}
      </p>
    </div>
  );
}

export function HoldersDilemma() {
  const reduceMotion = useReducedMotion();
  const [seconds, setSeconds] = useState(6138);
  const [pot, setPot] = useState(128.42);
  const [cooperateSignal, setCooperateSignal] = useState(62);
  const [decision, setDecision] = useState<Decision>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uiNotice, setUiNotice] = useState("");
  const streakRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: streakRef,
    offset: ["start end", "end start"],
  });
  const streakProgress = useTransform(scrollYProgress, [0.12, 0.7], [0, 1]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 6138));
    }, 1000);

    const dataPulse = window.setInterval(() => {
      setCooperateSignal((current) => (current === 62 ? 61 : 62));
      setPot((current) => (current >= 128.45 ? 128.42 : current + 0.01));
    }, 5600);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(dataPulse);
    };
  }, []);

  useEffect(() => {
    if (!decision) return;
    const reset = window.setTimeout(() => setDecision(null), 3200);
    return () => window.clearTimeout(reset);
  }, [decision]);

  const showPreviewNotice = (message: string) => {
    setUiNotice(message);
    window.setTimeout(() => setUiNotice(""), 2800);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className="site-header">
        <div className="system-strip" aria-hidden="true">
          <span>PROTOCOL DESIGN / FRONTEND PREVIEW</span>
          <span>STATUS: PRE-DEPLOYMENT</span>
        </div>
        <nav className="site-nav" aria-label="Primary navigation">
          <a className="brand" href="#experiment" onClick={closeMenu}>
            <BrandMark />
            <span>THE HODLER’S DILEMNA</span>
          </a>

          <button
            type="button"
            className="menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
          </button>

          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#experiment" onClick={closeMenu}>Experiment</a>
            <a href="#mechanics" onClick={closeMenu}>Mechanics</a>
            <a href="#streaks" onClick={closeMenu}>Streaks</a>
            <a href="#leaderboard" onClick={closeMenu}>Leaderboard</a>
            <WalletConnect />
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero section-shell" id="experiment">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-copy">
            <motion.p
              className="eyebrow hero-eyebrow"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <span>ON-CHAIN SOCIAL EXPERIMENT</span>
              <span>CASE / 024</span>
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              EVERY HOLDER FACES <em>THE SAME CHOICE.</em>
            </motion.h1>
            <motion.p
              className="hero-description"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
            >
              Cooperate with the holders beside you, or defect and attempt to take more for yourself.
            </motion.p>
            <motion.div
              className="hero-actions"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2 }}
            >
              <a className="button button-primary" href="#dilemma">Enter the Dilemma <span>↘</span></a>
              <a className="button button-secondary" href="#mechanics">View the Rules</a>
            </motion.div>

            <div className="hero-dossier" aria-label="Experiment classification">
              <span>SUBJECTS<br /><strong>HOLDERS</strong></span>
              <span>VARIABLE<br /><strong>CONVICTION</strong></span>
              <span>INCENTIVE<br /><strong>FEE WEIGHT</strong></span>
            </div>
          </div>

          <motion.div
            className="hero-panel-wrap"
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <ExperimentPanel
              seconds={seconds}
              pot={pot}
              cooperateSignal={cooperateSignal}
              decision={decision}
              onDecision={setDecision}
            />
          </motion.div>

          <div className="scroll-cue" aria-hidden="true"><span>SCROLL TO EXAMINE</span><i /></div>
        </section>

        <section className="content-section section-shell" id="dilemma">
          <SectionHeading
            number="01"
            eyebrow="THE DILEMMA"
            title="COORDINATION HAS A PRICE. SO DOES BETRAYAL."
            description="A proposed round structure built around one private decision and one collective outcome."
          />

          <Reveal>
            <div className="matrix" role="group" aria-label="Game theory outcome matrix">
              <div className="matrix-corner-label">YOUR CHOICE ↓<br />COLLECTIVE RESULT →</div>
              <div className="matrix-column">MAJORITY COOPERATES</div>
              <div className="matrix-column">TOO MANY DEFECT</div>
              <div className="matrix-row">YOU COOPERATE</div>
              {outcomes.slice(0, 2).map((outcome) => (
                <article className={`outcome-card ${outcome.tone}`} key={`${outcome.you}-${outcome.majority}`}>
                  <div className="mobile-matrix-label"><span>{outcome.you}</span><span>{outcome.majority}</span></div>
                  <span className="outcome-code">OUTCOME / {outcome.title === "WEIGHTED SHARE" ? "A" : "B"}</span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.copy}</p>
                </article>
              ))}
              <div className="matrix-row">YOU DEFECT</div>
              {outcomes.slice(2).map((outcome) => (
                <article className={`outcome-card ${outcome.tone}`} key={`${outcome.you}-${outcome.majority}`}>
                  <div className="mobile-matrix-label"><span>{outcome.you}</span><span>{outcome.majority}</span></div>
                  <span className="outcome-code">OUTCOME / {outcome.title === "INCREASED SHARE" ? "C" : "D"}</span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.copy}</p>
                </article>
              ))}
            </div>
          </Reveal>

          <Reveal className="pull-quote">
            <span className="quote-index">{"//"}</span>
            <p>Every round rewards coordination, tempts betrayal, and records who chose conviction over extraction.</p>
          </Reveal>
        </section>

        <section className="content-section streak-section section-shell" id="streaks" ref={streakRef}>
          <SectionHeading
            number="02"
            eyebrow="DIAMOND HANDS STREAK"
            title="CONVICTION COMPOUNDS."
            description="Your fee-share multiplier grows for as long as your wallet holds without selling. Sell any amount and the streak returns to the base level."
          />

          <div className="streak-layout">
            <div className="streak-timeline">
              <div className="timeline-line" aria-hidden="true">
                <motion.div className="timeline-fill" style={{ scaleX: reduceMotion ? 1 : streakProgress }} />
              </div>
              {streakSteps.map((step, index) => (
                <Reveal className="streak-step" delay={index * 0.07} key={step.label}>
                  <span className="streak-node" aria-hidden="true" />
                  <span>{step.label}</span>
                  <strong>{step.value}</strong>
                  {index === streakSteps.length - 1 ? <small>MULTIPLIER PROGRESSION</small> : null}
                </Reveal>
              ))}
            </div>

            <Reveal className="wallet-card-wrap" delay={0.12}>
              <div className="wallet-card terminal-frame">
                <div className="wallet-card-header"><span>SAMPLE WALLET</span><span className="status-dot">TRACKING</span></div>
                <div className="wallet-ident"><BrandMark /><strong>7F3...A91</strong></div>
                <dl>
                  <div><dt>Current Streak</dt><dd>12 Days</dd></div>
                  <div><dt>Holding Tier</dt><dd>Diamond Hands</dd></div>
                  <div className="multiplier-row"><dt>Current Multiplier</dt><dd>2.7x</dd></div>
                </dl>
                <div className="wallet-bar"><motion.span animate={reduceMotion ? undefined : { width: ["68%", "72%", "68%"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} /></div>
                <p>ILLUSTRATIVE WALLET PROFILE</p>
              </div>
            </Reveal>
          </div>

          <p className="configuration-note"><span>PARAMETER NOTE</span> Exact multiplier curves and launch parameters remain subject to final protocol configuration.</p>
        </section>

        <section className="content-section section-shell tier-section">
          <SectionHeading
            number="03"
            eyebrow="HOLDING TIERS"
            title="FOUR STATES OF CONVICTION."
            description="Placement is designed to consider uninterrupted holding time, percentage of supply held, and position consistency. Exact thresholds are not yet configured."
          />
          <div className="tier-grid">
            {tiers.map((tier, index) => (
              <Reveal className="tier-card" delay={index * 0.09} key={tier.name}>
                <div className="tier-top"><span>{tier.code}</span><span>0{index + 1}</span></div>
                <div className={`tier-emblem tier-${index + 1}`} aria-hidden="true"><span /></div>
                <h3>{tier.name}</h3>
                <p>{tier.description}</p>
                <div className="tier-signal"><i /><span>{tier.signal}</span></div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="betrayal-section section-shell">
          <div className="betrayal-grid-bg" aria-hidden="true" />
          <SectionHeading
            number="04"
            eyebrow="PLANNED MECHANIC / BETRAYAL BOUNTY"
            title="WHEN SOMEONE FOLDS, THE HOLDERS WHO REMAIN BENEFIT."
            description="When a wallet with a developed streak sells, part of its forfeited reward weight can be redirected into a Betrayal Bounty for remaining eligible holders."
          />
          <Reveal className="betrayal-statement">
            <span>THEIR</span> PAPER HANDS <span>BECOME</span> YOUR REWARD.
          </Reveal>
          <div className="betrayal-flow" aria-label="Illustrative betrayal bounty flow">
            {["WALLET EXITS", "MULTIPLIER FORFEITED", "BOUNTY FUNDED", "HOLDERS REWARDED"].map((item, index) => (
              <Reveal className="flow-step" delay={index * 0.1} key={item}>
                <span>0{index + 1}</span>
                <strong>{item}</strong>
                {index < 3 ? <i aria-hidden="true">→</i> : null}
              </Reveal>
            ))}
          </div>
          <p className="planned-label">PROPOSED BEHAVIOR / NOT YET DEPLOYED</p>
        </section>

        <section className="content-section temptation-section section-shell">
          <div className="warning-header"><span>⚠</span><span>WARNING BULLETIN / PREVIEW</span><span>EVT-07</span></div>
          <div className="temptation-layout">
            <div>
              <p className="eyebrow warning-eyebrow">UNPREDICTABLE PROTOCOL EVENT</p>
              <h2>TEMPTATION WINDOW <em>DETECTED</em></h2>
              <p className="section-description">At unpredictable moments, the protocol may open brief reduced-fee or tax-free selling windows designed to test holder conviction.</p>
              <div className="temptation-outcomes">
                <article>
                  <span className="defect-label">SELL DURING THE WINDOW</span>
                  <p>Lose the active streak and return to the base multiplier.</p>
                </article>
                <article>
                  <span className="cooperate-label">SURVIVE THE WINDOW</span>
                  <p>Receive an additional streak bonus.</p>
                </article>
              </div>
            </div>
            <Reveal className="countdown-card terminal-frame">
              <div className="countdown-top"><span>TEMPTATION EVENT</span><span>PREVIEW</span></div>
              <p>REDUCED-FEE WINDOW CLOSES IN</p>
              <strong>{formatTime(Math.max(0, seconds - 3600))}</strong>
              <div className="countdown-segments" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, index) => <i className={index < 8 ? "active" : ""} key={index} />)}
              </div>
              <div className="countdown-data"><span>ACTIVE STREAK<br /><b>12 DAYS</b></span><span>SURVIVAL BONUS<br /><b>PROPOSED</b></span></div>
            </Reveal>
          </div>
        </section>

        <section className="content-section section-shell" id="leaderboard">
          <SectionHeading
            number="05"
            eyebrow="SEASONAL RANKING / PLACEHOLDER DATA"
            title="LAST HOLDER STANDING"
            description="Monthly seasons are planned to rank wallets by uninterrupted holding streak, position strength, participation, and total conviction."
          />

          <Reveal className="leaderboard-shell terminal-frame">
            <div className="leaderboard-meta"><span>SEASON 00 / SIMULATION</span><span>6 OF 10,842 SUBJECTS SHOWN</span></div>
            <div className="leaderboard-table-wrap">
              <table>
                <caption className="sr-only">Illustrative Last Holder Standing leaderboard</caption>
                <thead><tr><th>Rank</th><th>Wallet</th><th>Tier</th><th>Streak</th><th>Dilemma Record</th><th>Multiplier</th></tr></thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank}>
                      <td><span className={`rank rank-${entry.rank}`}>{entry.rank.toString().padStart(2, "0")}</span></td>
                      <td>{entry.wallet}</td><td>{entry.tier}</td><td>{entry.streak}</td><td>{entry.record}</td><td className="gold-value">{entry.multiplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-leaderboard">
              {leaderboard.map((entry) => (
                <article key={entry.rank}>
                  <span className={`rank rank-${entry.rank}`}>{entry.rank.toString().padStart(2, "0")}</span>
                  <div><strong>{entry.wallet}</strong><small>{entry.tier} / {entry.streak}</small></div>
                  <div><strong className="gold-value">{entry.multiplier}</strong><small>{entry.record}</small></div>
                </article>
              ))}
            </div>
            <div className="leaderboard-footer"><span>TOP STREAKS SHARE A PROPOSED SEASONAL BONUS POOL</span><span>ILLUSTRATIVE DATA ONLY</span></div>
          </Reveal>
        </section>

        <section className="content-section feed-section section-shell">
          <SectionHeading
            number="06"
            eyebrow="EXPERIMENT FEED"
            title="THE RECORD NEVER BLINKS."
            description="A simulated view of how round, wallet, bounty, and temptation events could appear in the live protocol interface."
          />
          <div className="feed-shell">
            <div className="feed-status"><span><i /> EVENT STREAM</span><span>SIMULATED / UTC</span></div>
            {feed.map((item, index) => (
              <Reveal className={`feed-row ${item.tone}`} delay={index * 0.08} key={item.event}>
                <time>{item.time}</time>
                <span className="feed-marker" aria-hidden="true" />
                <div><strong>{item.event}</strong><p>{item.detail}</p></div>
                <span className="feed-code">EVT-{(31 + index).toString().padStart(3, "0")}</span>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="content-section mechanics-section section-shell" id="mechanics">
          <SectionHeading
            number="07"
            eyebrow="PROPOSED MECHANICS"
            title="HOW THE EXPERIMENT WORKS."
          />
          <div className="mechanics-list">
            {mechanics.map((mechanic, index) => (
              <Reveal className="mechanic-row" delay={index * 0.06} key={mechanic.number}>
                <span className="mechanic-number">{mechanic.number}</span>
                <h3>{mechanic.title}</h3>
                <p>{mechanic.copy}</p>
                <span className="mechanic-arrow" aria-hidden="true">↘</span>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="final-cta section-shell">
          <div className="final-code" aria-hidden="true">END / SUBJECT DECIDES</div>
          <Reveal>
            <p>THE MARKET ALREADY TESTS YOUR CONVICTION.</p>
            <h2>WE TURNED THE TEST<br /><em>INTO THE PROTOCOL.</em></h2>
            <div className="hero-actions final-actions">
              <a className="button button-primary" href="#experiment">Enter the Experiment <span>↑</span></a>
              <a className="button button-secondary" href="#mechanics">Read the Mechanics</a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="site-footer section-shell">
        <div className="footer-top">
          <a className="brand footer-brand" href="#experiment"><BrandMark /><span>THE HODLER’S DILEMNA</span></a>
          <div className="footer-links">
            <button type="button" onClick={() => showPreviewNotice("The official X account will be announced before launch.")}>X</button>
            <button type="button" onClick={() => showPreviewNotice("The official Telegram will be announced before launch.")}>Telegram</button>
          </div>
          <div className="footer-coming-soon"><span>CONTRACT <b>COMING SOON</b></span><span>DOCUMENTATION <b>COMING SOON</b></span></div>
        </div>
        <div className="footer-bottom">
          <p>The displayed data is illustrative until the live protocol and contracts are deployed. Participation involves financial and smart-contract risk.</p>
          <span>© 2026 / PROTOCOL DESIGN PREVIEW</span>
        </div>
      </footer>

      <div className={`ui-toast ${uiNotice ? "visible" : ""}`} role="status" aria-live="polite">{uiNotice}</div>
    </>
  );
}
