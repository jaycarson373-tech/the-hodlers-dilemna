"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/section-heading";
import { WalletConnect } from "@/components/wallet-connect";
import {
  feed,
  leaderboard,
  mechanics,
  outcomes,
  roundHistory,
  streakSteps,
  tiers,
} from "@/lib/experiment-data";

type Decision = "cooperate" | "defect" | null;

const previewMode = process.env.NEXT_PUBLIC_PREVIEW_MODE !== "false";
const tokenMint = process.env.NEXT_PUBLIC_TOKEN_MINT?.trim();
const pumpUrl = process.env.NEXT_PUBLIC_PUMP_URL?.trim();
const jupiterUrl = process.env.NEXT_PUBLIC_JUPITER_URL?.trim();
const xUrl = process.env.NEXT_PUBLIC_X_URL?.trim();
const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim();
const officialLogoSrc = "/hodl-no-hodl-logo-v2.jpg";
const officialBannerSrc = "/hodl-no-hodl-banner-v2.jpg";
const buyLinks = [
  { label: "Pump.fun", href: pumpUrl },
  { label: "Jupiter", href: jupiterUrl },
].filter((link): link is { label: string; href: string } => Boolean(link.href));

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

function OfficialMark({ className = "" }: { className?: string }) {
  return (
    <span className={`official-mark ${className}`} aria-hidden="true">
      {/* Kept unprocessed so the supplied official artwork remains byte-for-byte unchanged. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={officialLogoSrc} alt="" width="1254" height="1254" />
    </span>
  );
}

function AmbientBackground() {
  return (
    <div className="ambient-background" aria-hidden="true">
      <div className="ambient-wash" />
      <div className="ambient-rings" />
      <div className="page-particles">
        {Array.from({ length: 16 }).map((_, index) => (
          <i
            key={index}
            style={{
              left: `${(index * 37) % 97}%`,
              top: `${(index * 53) % 91}%`,
              animationDelay: `-${index * 0.7}s`,
              animationDuration: `${12 + (index % 5) * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AnimatedValue({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      key={String(children)}
      initial={false}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.span>
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
      initial={false}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function PreviewBanner() {
  if (!previewMode) return null;
  return (
    <div className="preview-mode-banner" role="status">
      <span>PROTOCOL PREVIEW</span>
      <p>Live rounds begin once the protocol launches.</p>
    </div>
  );
}

function StickyBuyBar({ onCopy }: { onCopy: (message: string) => void }) {
  if (!tokenMint && buyLinks.length === 0 && !xUrl && !telegramUrl) return null;

  const copyContract = async () => {
    if (!tokenMint) return;
    await navigator.clipboard?.writeText(tokenMint).catch(() => undefined);
    onCopy("Contract copied.");
  };

  return (
    <aside className="sticky-buy-bar" aria-label="Buy and community links">
      {buyLinks.length ? <a className="sticky-buy-button" href={buyLinks[0].href} target="_blank" rel="noreferrer">BUY</a> : null}
      {tokenMint ? (
        <button type="button" onClick={() => void copyContract()}>
          <span>CA</span>
          <strong>{tokenMint.slice(0, 4)}…{tokenMint.slice(-5)}</strong>
        </button>
      ) : null}
      {buyLinks.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}
      {xUrl ? <a href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
      {telegramUrl ? <a href={telegramUrl} target="_blank" rel="noreferrer">Telegram</a> : null}
    </aside>
  );
}

function ExperimentPanel({
  broadcastStatus,
  decision,
  onDecision,
}: {
  broadcastStatus: string;
  decision: Decision;
  onDecision: (decision: Exclude<Decision, null>) => void;
}) {
  return (
    <div className="experiment-panel live-protocol-panel">
      <div className="live-preview-heading">
        <p><i className="live-dot" /> BANKER ONLINE / LIVE BROADCAST</p>
        <h2>WAITING FOR THE BANKER&apos;S CALL.</h2>
        <span>The first case stays sealed until the funded pot is ready. Every holder eventually faces the same offer.</span>
      </div>

      <div className="live-preview-grid" aria-label="Round model data">
        <article className="live-preview-card round-preview-card">
          <span>BROADCAST STATUS</span>
          <strong><AnimatedValue>{broadcastStatus}</AnimatedValue></strong>
          <small>THE BANKER IS REVIEWING</small>

          <span>NEXT CALL</span>
          <strong><AnimatedValue>Launching Soon</AnimatedValue></strong>
          <small>COUNTDOWN APPEARS WHEN LIVE</small>
        </article>

        <article className="live-preview-card signal-preview-card">
          <span>THE OFFER</span>
          <strong><AnimatedValue>Decision pending</AnimatedValue></strong>
          <small>NO OFFER AVAILABLE YET</small>

          <span>CURRENT POT</span>
          <strong><AnimatedValue>Awaiting funded pot</AnimatedValue></strong>

          <span>CASE STATUS</span>
          <strong><AnimatedValue>Locked</AnimatedValue></strong>
        </article>

        <article className="live-preview-card pot-preview-card">
          <span>WHAT&apos;S IN THE BOX?</span>
          <strong><AnimatedValue>?</AnimatedValue></strong>
          <small>THE CASE IS SEALED</small>
          <p>The Banker opens the round when the first funded pot is ready.</p>

          <div className="decision-grid" aria-label="Decision demonstration">
          <motion.button
            type="button"
            className={`decision-button cooperate ${decision === "cooperate" ? "selected" : ""}`}
            aria-pressed={decision === "cooperate"}
            onClick={() => onDecision("cooperate")}
            whileTap={{ scale: 0.985 }}
          >
            <strong>HODL</strong>
          </motion.button>
          <motion.button
            type="button"
            className={`decision-button defect ${decision === "defect" ? "selected" : ""}`}
            aria-pressed={decision === "defect"}
            onClick={() => onDecision("defect")}
            whileTap={{ scale: 0.985 }}
          >
            <strong>NO HODL</strong>
          </motion.button>
          </div>

          <p className="panel-footnote" role="status" aria-live="polite">
            Live controls activate when the Banker opens the round.
          </p>
        </article>
      </div>
    </div>
  );
}

export function HoldersDilemma() {
  const reduceMotion = useReducedMotion();
  const [seconds, setSeconds] = useState(6138);
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uiNotice, setUiNotice] = useState("");
  const [isLoading] = useState(false);
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

    const statusPulse = window.setInterval(() => {
      setBroadcastIndex((current) => (current + 1) % 6);
    }, 4600);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(statusPulse);
    };
  }, [reduceMotion]);

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
  const broadcastStatus = ["BANKER ONLINE", "ROUND LOCKED", "OFFER INCOMING", "CASE OPENING", "DECISION PENDING", "OFFER LOCKED"][broadcastIndex];

  return (
    <>
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            className="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.45 }}
            aria-hidden="true"
          >
            <motion.div
              className="loading-mark-wrap"
              animate={reduceMotion ? undefined : { scale: [0.97, 1.025, 0.97] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <OfficialMark className="official-mark-loading" />
            </motion.div>
            <span>OPENING THE CASE</span>
            <i><b /></i>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AmbientBackground />
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <PreviewBanner />
      <StickyBuyBar onCopy={showPreviewNotice} />

      <header className="site-header">
        <nav className="site-nav" aria-label="Primary navigation">
          <a className="brand" href="#experiment" onClick={closeMenu}>
            <OfficialMark className="official-mark-nav" />
            <span>HODL OR NO HODL<span className="brand-domain">.FUN</span></span>
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
            <a href="#dilemma" onClick={closeMenu}>The Choice</a>
            <a href="#streaks" onClick={closeMenu}>Streaks</a>
            <a href="#boxes" onClick={closeMenu}>Boxes</a>
            <a href="#leaderboard" onClick={closeMenu}>Leaderboard</a>
            <a className="nav-game-link" href="/play" onClick={closeMenu}>Enter Game</a>
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
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <span><i className="live-dot" /> LIVE BROADCAST / BANKER ONLINE</span>
            </motion.p>
            <motion.h1
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              HODL OR <em>NO HODL</em>
            </motion.h1>
            <motion.p
              className="hero-description"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
            >
              Every holder gets the call. Keep the box closed, or take the Banker&apos;s offer.
            </motion.p>
            <motion.p
              className="brand-tagline"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.17 }}
            >
              WHAT&apos;S IN YOUR BOX?
            </motion.p>
            <motion.div
              className="hero-actions"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2 }}
            >
              <a className="button button-primary" href="/play">Enter Game <span>↘</span></a>
              <a className="button button-secondary" href="#mechanics">Read the Rules</a>
            </motion.div>

          </div>

          <motion.div
            className="hero-logo-stage"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="case-board case-board-left" aria-hidden="true">
              {["1 TOKEN", "10K", "50K", "100K", "250K", "500K"].map((value) => <span key={value}>{value}</span>)}
            </div>
            <div className="case-board case-board-right" aria-hidden="true">
              {["1 SOL", "5 SOL", "10 SOL", "25 SOL", "50 SOL", "POT"].map((value) => <span key={value}>{value}</span>)}
            </div>
            <div className="hero-logo-orbit" aria-hidden="true"><i /><i /><i /></div>
            <motion.div
              className="hero-logo-aura"
              animate={reduceMotion ? undefined : { rotate: [-0.45, 0.45, -0.45], scale: [0.99, 1.012, 0.99] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            >
              <OfficialMark className="official-mark-hero" />
            </motion.div>
            <div className="hero-logo-caption"><span>THE BANKER IS CALLING</span><i /> <span>ROUND ARMING</span></div>
          </motion.div>

          <div className="hero-dossier" aria-label="Experiment classification">
            <span>CONTESTANTS<br /><strong>HOLDERS</strong></span>
            <span>VARIABLE<br /><strong>CONVICTION</strong></span>
            <span>IN THE BOX<br /><strong>FEE WEIGHT</strong></span>
          </div>

          <div className="scroll-cue" aria-hidden="true"><span>SCROLL TO EXAMINE</span><i /></div>
        </section>

        <section className="live-dilemma-section section-shell" aria-label="Hodl or no hodl round model">
          <Reveal>
            <ExperimentPanel
              broadcastStatus={broadcastStatus}
              decision={decision}
              onDecision={setDecision}
            />
          </Reveal>
        </section>

        <section className="game-entry-section section-shell" id="play" aria-label="Enter the live Hodl or No Hodl game">
          <Reveal>
            <div className="game-entry-card">
              <div className="game-entry-copy">
                <span>LIVE GAME ROOM / 30-MINUTE ROUNDS</span>
                <h2>READY TO OPEN YOUR BOX?</h2>
                <p>Connect a Solana wallet, claim your 500K-token seat, then choose HODL or NO HODL before the Banker closes the case.</p>
              </div>
              <div className="game-entry-steps" aria-label="Game entry steps">
                <span>01 CONNECT</span>
                <span>02 SIGN</span>
                <span>03 VERIFY 500K</span>
                <span>04 CHOOSE</span>
              </div>
              <a className="button button-primary game-entry-button" href="/play">Enter the Game <span>→</span></a>
            </div>
          </Reveal>
        </section>

        <section className="content-section section-shell" id="dilemma">
          <SectionHeading
            number="01"
            eyebrow="THE CHOICE"
            title="COORDINATION HAS A PRICE. SO DOES BETRAYAL."
            description="Each round is built around one holder decision and one collective outcome."
          />

          <Reveal>
            <div className="matrix" role="group" aria-label="Game theory outcome matrix">
              <div className="matrix-corner-label">YOUR CHOICE ↓<br />BOARD RESULT →</div>
              <div className="matrix-column">MAJORITY HODL</div>
              <div className="matrix-column">TOO MANY TAKE THE DEAL</div>
              <div className="matrix-row">YOU HODL</div>
              {outcomes.slice(0, 2).map((outcome, index) => (
                <article className={`outcome-card ${outcome.tone}`} key={`${outcome.you}-${outcome.majority}`}>
                  <div className="mobile-matrix-label"><span>{outcome.you}</span><span>{outcome.majority}</span></div>
                  <span className="outcome-code">OUTCOME / {index === 0 ? "A" : "B"}</span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.copy}</p>
                </article>
              ))}
              <div className="matrix-row">YOU TAKE THE DEAL</div>
              {outcomes.slice(2).map((outcome, index) => (
                <article className={`outcome-card ${outcome.tone}`} key={`${outcome.you}-${outcome.majority}`}>
                  <div className="mobile-matrix-label"><span>{outcome.you}</span><span>{outcome.majority}</span></div>
                  <span className="outcome-code">OUTCOME / {index === 0 ? "C" : "D"}</span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.copy}</p>
                </article>
              ))}
            </div>
          </Reveal>

          <div className="round-history-heading">
            <span>ROUND HISTORY MODEL</span>
            <span>RECENT OUTCOME FORMAT</span>
          </div>
          <div className="round-history-grid">
            {roundHistory.map((round, index) => (
              <Reveal className={`history-card ${round.tone}`} delay={index * 0.075} key={round.round}>
                <div className="history-card-top">
                  <span>ROUND {round.round}</span>
                  <i aria-hidden="true" />
                </div>
                <strong>{round.outcome}</strong>
                <dl>
                  <div><dt>PUBLIC SIGNAL</dt><dd>{round.split}</dd></div>
                  <div><dt>FEE POT</dt><dd>{round.pot}</dd></div>
                </dl>
                <span className="history-result">{round.result}</span>
              </Reveal>
            ))}
          </div>

          <Reveal className="pull-quote">
            <span className="quote-index">{"//"}</span>
            <p>Every round rewards coordination, tempts betrayal, and records who chose the offer over conviction.</p>
          </Reveal>
        </section>

        <section className="content-section streak-section section-shell" id="streaks" ref={streakRef}>
          <SectionHeading
            number="02"
            eyebrow="DIAMOND HANDS STREAK"
            title="CONVICTION COMPOUNDS."
            description="Your fee-share multiplier climbs the board for as long as your wallet holds without selling. Sell any amount and you drop back to the bottom row."
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
                <div className="wallet-card-header"><span>WALLET SEAT</span><span className="status-dot">BANKER WATCH</span></div>
                <div className="wallet-ident"><OfficialMark className="official-mark-wallet" /><strong>7F3...A91</strong></div>
                <dl>
                  <div><dt>Current Streak</dt><dd>12 Days</dd></div>
                  <div><dt>Holding Tier</dt><dd>Diamond Hands</dd></div>
                  <div className="multiplier-row"><dt>Current Multiplier</dt><dd>2.7x</dd></div>
                </dl>
                <div className="wallet-bar"><motion.span animate={reduceMotion ? undefined : { width: ["68%", "72%", "68%"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} /></div>
                <p>WALLET PROFILE FORMAT</p>
              </div>
            </Reveal>
          </div>

          <p className="configuration-note"><span>ELIGIBILITY NOTE</span> Wallets need at least 500,000 tokens to enter the live game.</p>
        </section>

        <section className="content-section section-shell tier-section" id="boxes">
          <SectionHeading
            number="03"
            eyebrow="HOLDING TIERS"
            title="FOUR BOXES. FOUR STATES OF CONVICTION."
            description="Placement considers uninterrupted holding time, position strength, and consistency."
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
            eyebrow="BONUS MECHANIC / BETRAYAL BOUNTY"
            title="WHEN SOMEONE TAKES THE DEAL, THE HODLERS WHO REMAIN BENEFIT."
            description="When a wallet with a developed streak sells, part of its forfeited reward weight can be redirected into a Betrayal Bounty for remaining eligible holders."
          />
          <Reveal className="betrayal-statement">
            THEIR DEAL BECOMES YOUR REWARD. 💰
          </Reveal>
          <div className="betrayal-flow" aria-label="Betrayal bounty flow">
            {[
              ["DEAL TAKEN", "A streaked wallet accepts the offer and exits."],
              ["MULTIPLIER FORFEITED", "Its accumulated reward weight is released."],
              ["BOUNTY FUNDED", "The forfeited weight funds a Betrayal Bounty."],
              ["HODLERS REWARDED", "Remaining eligible holders share the bounty."],
            ].map(([item, copy], index) => (
              <Reveal className="flow-step" delay={index * 0.1} key={item}>
                <span>0{index + 1}</span>
                <strong>{item}</strong>
                <p>{copy}</p>
                {index < 3 ? <i aria-hidden="true">→</i> : null}
              </Reveal>
            ))}
          </div>
          <p className="planned-label">BONUS LOGIC / HOLDER INCENTIVES</p>
        </section>

        <section className="content-section temptation-section section-shell">
          <div className="warning-header"><span>⚠</span><span>WARNING BULLETIN</span><span>EVT-07</span></div>
          <div className="temptation-layout">
            <div>
              <p className="eyebrow warning-eyebrow">UNPREDICTABLE PROTOCOL EVENT</p>
              <h2>THE BANKER IS <em>CALLING.</em></h2>
              <p className="section-description">At unpredictable moments, the protocol may open brief reduced-fee or tax-free selling windows designed to test holder conviction.</p>
              <div className="temptation-outcomes">
                <article>
                  <span className="defect-label">TAKE THE OFFER</span>
                  <p>Lose the active streak and return to the base multiplier.</p>
                </article>
                <article>
                  <span className="cooperate-label">HODL THROUGH IT</span>
                  <p>Receive an additional streak bonus.</p>
                </article>
              </div>
            </div>
            <Reveal className="countdown-card terminal-frame">
              <div className="countdown-top"><span>TEMPTATION EVENT</span><span>BONUS TEST</span></div>
              <p>REDUCED-FEE WINDOW CLOSES IN</p>
              <strong>{formatTime(Math.max(0, seconds - 3600))}</strong>
              <div className="countdown-segments" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, index) => <i className={index < 8 ? "active" : ""} key={index} />)}
              </div>
              <div className="countdown-data"><span>ACTIVE STREAK<br /><b>12 DAYS</b></span><span>SURVIVAL BONUS<br /><b>TRACKED</b></span></div>
            </Reveal>
          </div>
        </section>

        <section className="content-section section-shell" id="leaderboard">
          <SectionHeading
            number="05"
            eyebrow="SEASONAL RANKING"
            title="LAST CONTESTANT STANDING."
            description="Monthly seasons are planned to rank wallets by uninterrupted holding streak, position strength, participation, and total conviction."
          />

          <Reveal className="leaderboard-shell terminal-frame">
            <div className="leaderboard-meta"><span>SEASON 00</span><span>BOARD FORMAT LOCKED</span></div>
            <div className="leaderboard-table-wrap">
              <table>
                <caption className="sr-only">Last Holder Standing leaderboard format</caption>
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
            <div className="leaderboard-footer"><span>TOP STREAKS SHARE A SEASONAL BONUS POOL</span><span>LIVE RANKING FORMAT</span></div>
          </Reveal>
        </section>

        <section className="content-section feed-section section-shell">
          <SectionHeading
            number="06"
            eyebrow="BANKER FEED"
            title="THE BOARD NEVER BLINKS."
            description="Round, wallet, bounty, and temptation events are recorded in the protocol interface."
          />
          <div className="feed-shell">
            <div className="feed-status"><span><i /> EVENT STREAM</span><span>UTC</span></div>
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
            eyebrow="MECHANICS"
            title="HOW THE GAME WORKS."
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
          <div className="final-code" aria-hidden="true">FINAL OFFER / SUBJECT DECIDES</div>
          <Reveal>
            <p>THE MARKET ALREADY TESTS YOUR CONVICTION.</p>
            <h2>WE TURNED THE TEST<br /><em>INTO THE PROTOCOL.</em></h2>
            <div className="hero-actions final-actions">
              <a className="button button-primary" href="/play">Enter Game <span>↑</span></a>
              <a className="button button-secondary" href="#mechanics">Read the Rules</a>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="site-footer section-shell">
          <div className="footer-top">
          <a className="brand footer-brand" href="#experiment"><OfficialMark className="official-mark-footer" /><span>HODL OR NO HODL<span className="brand-domain">.FUN</span></span></a>
          <div className="footer-banner" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={officialBannerSrc} alt="" width="1280" height="426" />
          </div>
          <div className="footer-links">
            {xUrl ? <a href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
            {telegramUrl ? <a href={telegramUrl} target="_blank" rel="noreferrer">Telegram</a> : null}
            {buyLinks.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}
            {tokenMint ? <button type="button" onClick={() => void navigator.clipboard?.writeText(tokenMint).then(() => showPreviewNotice("Contract copied."))}>Copy CA</button> : null}
          </div>
          <div className="footer-coming-soon"><span>BANKER STATUS <b>AWAITING FIRST CALL</b></span></div>
        </div>
        <div className="footer-bottom">
          <p>Participation involves financial, wallet, and smart-contract risk. Verify the contract address before trading.</p>
          <span>© 2026 / HODL OR NO HODL.FUN</span>
        </div>
      </footer>

      <div className={`ui-toast ${uiNotice ? "visible" : ""}`} role="status" aria-live="polite">{uiNotice}</div>
    </>
  );
}
