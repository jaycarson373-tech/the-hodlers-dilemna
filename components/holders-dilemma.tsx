"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/section-heading";
import { useBankerFeed } from "@/components/use-banker-feed";
import { WalletConnect } from "@/components/wallet-connect";
import {
  leaderboard,
  outcomes,
  roundHistory,
  streakSteps,
  tiers,
} from "@/lib/experiment-data";
import { lamportsToSol, protocolApiUrl, protocolRequest, type ProtocolStatus } from "@/lib/protocol-api";
import { SIMULATION_COUNTDOWN_SECONDS, simulationStatus } from "@/lib/protocol-simulation";

type Decision = "cooperate" | "defect" | null;

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
  countdown,
  decision,
  onDecision,
  simulation,
  status,
}: {
  broadcastStatus: string;
  countdown: number;
  decision: Decision;
  onDecision: (decision: Exclude<Decision, null>) => void;
  simulation: boolean;
  status: ProtocolStatus;
}) {
  const round = status.round;
  const currentPot = round?.potLamports ?? status.availablePoolLamports;
  const hasFundedPot = Number(currentPot ?? "0") > 0;
  const hasLiveRound = Boolean(status.roundActive && round);
  const potText = hasFundedPot ? `${lamportsToSol(currentPot)} SOL` : "AWAITING FUNDED POT";

  return (
    <div className="experiment-panel live-protocol-panel">
      <div className="live-status-heading">
        <p><i className="live-dot" /> BANKER ONLINE / {simulation ? "SIMULATION" : "LIVE BROADCAST"}</p>
        <h2>{hasLiveRound ? "THE BOX IS FILLING." : "WAITING FOR THE BANKER'S CALL."}</h2>
        <span>Six-hour episodes. Creator fees enter the box every 15 minutes. The final hour is decision time.</span>
      </div>

      <div className="live-status-grid" aria-label="Round model data">
        <article className="live-status-card round-status-card">
          <div className="live-card-label-row"><span>EPISODE</span>{simulation ? <b>SIMULATION</b> : null}</div>
          <strong><AnimatedValue>{hasLiveRound ? `ROUND ${status.currentRound}` : broadcastStatus}</AnimatedValue></strong>
          <small>{hasLiveRound ? "THE BANKER IS REVIEWING" : "AWAITING FIRST FUNDED POT"}</small>

          <span>{hasLiveRound ? "THE BANKER CALLS IN" : "NEXT CALL"}</span>
          <strong><AnimatedValue>{countdown > 0 ? formatTime(countdown) : "AWAITING CALL"}</AnimatedValue></strong>
          <small>DECISION WINDOW / FINAL 60 MINUTES</small>
        </article>

        <article className="live-status-card signal-status-card">
          <span>AUDIENCE SIGNAL</span>
          <strong><AnimatedValue>{simulation ? "62% HODL / 38% NO HODL" : "ESTIMATED SENTIMENT PENDING"}</AnimatedValue></strong>
          <div className="audience-signal-bar" aria-hidden="true"><i style={{ width: simulation ? "62%" : "50%" }} /><b /></div>
          <small>ESTIMATED SENTIMENT / NOT FINAL VOTES</small>

          <span>CURRENT POT</span>
          <strong><AnimatedValue>{potText}</AnimatedValue></strong>

          <span>LAST EPISODE</span>
          <strong><AnimatedValue>{simulation ? "BOX OPENED / 74.2% HODL" : "AWAITING RESULT"}</AnimatedValue></strong>
        </article>

        <article className="live-status-card pot-status-card">
          <span>WHAT&apos;S IN THE BOX?</span>
          <strong><AnimatedValue>{hasFundedPot ? lamportsToSol(currentPot) : "?"}</AnimatedValue></strong>
          <small>{hasFundedPot ? "SOL / LIVE CREATOR FEES" : "THE CASE IS SEALED"}</small>
          {status.potRolloverCount ? <div className="rollover-badge">POT HAS ROLLED {status.potRolloverCount}X</div> : null}
          <p>Silence counts as HODL. Selling counts as NO HODL.</p>

          <div className="decision-grid" aria-label="Decision controls">
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
            {decision ? `DEMO CHOICE: ${decision === "cooperate" ? "HODL" : "NO HODL"}` : "Choices unlock during the final 60 minutes."}
          </p>
        </article>
      </div>
    </div>
  );
}

export function HoldersDilemma() {
  const reduceMotion = useReducedMotion();
  const [seconds, setSeconds] = useState(6138);
  const [roundCountdown, setRoundCountdown] = useState(SIMULATION_COUNTDOWN_SECONDS);
  const [roundStatus, setRoundStatus] = useState<ProtocolStatus | null>(null);
  const [simulationMode, setSimulationMode] = useState(true);
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uiNotice, setUiNotice] = useState("");
  const [isLoading] = useState(false);
  const { events: bankerFeed, isSimulation: feedIsSimulation } = useBankerFeed();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 6138));
      setRoundCountdown((current) => Math.max(0, current - 1));
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
    if (!protocolApiUrl) return;
    let active = true;

    const refreshStatus = async () => {
      try {
        const next = await protocolRequest<ProtocolStatus>("/api/status");
        if (!active) return;
        if (!next.configured) {
          setRoundStatus(null);
          setSimulationMode(true);
          return;
        }
        setRoundStatus(next);
        setSimulationMode(false);
        const target = next.roundActive ? next.round?.closesAt : next.nextRoundAt;
        setRoundCountdown(target ? Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)) : 0);
      } catch (statusError) {
        console.error("Live panel status refresh failed", statusError);
        if (active) {
          setRoundStatus(null);
          setSimulationMode(true);
        }
      }
    };

    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!decision) return;
    const reset = window.setTimeout(() => setDecision(null), 3200);
    return () => window.clearTimeout(reset);
  }, [decision]);

  const showUiNotice = (message: string) => {
    setUiNotice(message);
    window.setTimeout(() => setUiNotice(""), 2800);
  };

  const closeMenu = () => setMenuOpen(false);
  const broadcastStatus = ["BANKER ONLINE", "ROUND LOCKED", "OFFER INCOMING", "CASE OPENING", "DECISION PENDING", "OFFER LOCKED"][broadcastIndex];
  const displayRoundStatus = simulationMode ? simulationStatus : roundStatus ?? simulationStatus;

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
      <StickyBuyBar onCopy={showUiNotice} />

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
            <div className="hero-logo-caption"><span>THE BANKER IS CALLING</span><i /> <span>BANKER ONLINE</span></div>
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
              countdown={roundCountdown}
              decision={decision}
              onDecision={setDecision}
              simulation={simulationMode}
              status={displayRoundStatus}
            />
          </Reveal>
        </section>

        <section className="game-entry-section section-shell" id="play" aria-label="Enter the live Hodl or No Hodl game">
          <Reveal>
            <div className="game-entry-card">
              <div className="game-entry-copy">
                <span>LIVE GAME ROOM / 6-HOUR EPISODES</span>
                <h2>READY TO OPEN YOUR BOX?</h2>
                <p>Creator fees enter the pot every 15 minutes. The HODL or NO HODL decision unlocks during the final hour.</p>
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
            <div className="rules-terminal" aria-labelledby="rules-title">
              <div className="rules-terminal-head">
                <span>THE RULES</span>
                <strong id="rules-title">THE 70% LINE DECIDES WHETHER THE BOX OPENS.</strong>
              </div>
              <div className="rules-terminal-grid">
                <article><span>70% LINE</span><p>Weighted HODL must reach at least 70% of threshold weight. Snapshot balance decides the line; dust cannot swing it.</p></article>
                <article><span>SILENCE</span><p>Silence counts as HODL at normal weight. Passive holders are never punished.</p></article>
                <article><span>SELL / TRANSFER OUT</span><p>Any balance decrease forces NO HODL, fully resets the streak, and makes the wallet ineligible for the defector tranche.</p></article>
                <article><span>SIGNED NO HODL</span><p>If the line holds, signed defectors are paid at 1.5x weight from a capped 20% tranche, then drop one streak tier.</p></article>
              </div>
              <p className="rules-terminal-lock">SELL AND YOU&apos;RE OUT. DEFECT AND YOU&apos;RE PAID.</p>
            </div>
          </Reveal>

          <Reveal>
            <div className="rules-outcome-grid" role="group" aria-label="Round outcome rules">
              {outcomes.map((outcome) => (
                <article className={`outcome-card ${outcome.tone}`} key={outcome.you}>
                  <div className="mobile-matrix-label"><span>{outcome.you}</span><span>{outcome.majority}</span></div>
                  <span className="outcome-code">{outcome.you} / {outcome.majority}</span>
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

        <section className="content-section streak-section section-shell" id="streaks">
          <SectionHeading
            number="02"
            eyebrow="STREAK LADDER"
            title="CONVICTION COMPOUNDS."
            description="Successful HODL episodes advance the streak. A signed NO HODL drops one tier. Any sell or transfer out resets the streak to zero."
          />

          <div className="streak-layout">
            <Reveal className="streak-ladder-wrap">
              <table className="streak-ladder">
                <caption className="sr-only">Streak multiplier ladder</caption>
                <thead><tr><th>STREAK</th><th>MULTIPLIER</th></tr></thead>
                <tbody>
                  {streakSteps.map((step) => (
                    <tr key={step.label}><td>{step.label}</td><td>{step.value}</td></tr>
                  ))}
                </tbody>
              </table>
            </Reveal>

            <Reveal className="wallet-card-wrap" delay={0.12}>
              <div className="wallet-card terminal-frame">
                <div className="wallet-card-header"><span>STREAK FORMAT</span><span className="status-dot">BANKER WATCH</span></div>
                <div className="wallet-ident"><OfficialMark className="official-mark-wallet" /><strong>7F3...A91</strong></div>
                <dl>
                  <div><dt>Current Streak</dt><dd>7 Episodes</dd></div>
                  <div><dt>Streak Tier</dt><dd>6–9</dd></div>
                  <div className="multiplier-row"><dt>Current Multiplier</dt><dd>1.5x</dd></div>
                </dl>
                <div className="wallet-bar"><motion.span animate={reduceMotion ? undefined : { width: ["68%", "72%", "68%"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} /></div>
                <p>WALLET PROFILE FORMAT</p>
              </div>
            </Reveal>
          </div>

          <p className="configuration-note"><span>WEIGHTING NOTE</span> Payout weight uses snapshot balance × streak multiplier. Signed HODL receives a 5% participation bonus for that episode only.</p>
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
            <div className="feed-status"><span><i /> EVENT STREAM</span><span>{feedIsSimulation ? "SIMULATION" : "REALTIME / UTC"}</span></div>
            {bankerFeed.map((item, index) => (
              <Reveal className={`feed-row ${item.tone}`} delay={index * 0.08} key={item.id}>
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
            title="HOW IT WORKS"
          />
          <div className="how-it-works-list">
            <Reveal className="how-it-works-step">
              <span>01</span>
              <div><h3>01 — CONNECT.</h3><p>Connect your wallet. Sign a message — no transaction, no approval, nothing leaves your wallet. Your box appears: balance, streak, multiplier, and your projected share of the pot if you hodl.</p></div>
            </Reveal>
            <Reveal className="how-it-works-step" delay={0.06}>
              <span>02</span>
              <div><h3>02 — THE POT FILLS.</h3><p>Creator fees sweep into the box every 15 minutes. All round long you can watch your number grow. That&apos;s all holding costs you: nothing.</p></div>
            </Reveal>
            <Reveal className="how-it-works-step" delay={0.12}>
              <span>03</span>
              <div><h3>03 — THE CALL COMES.</h3><p>Final hour of the episode, two buttons go live: <strong>HODL</strong> or <strong>NO HODL</strong>. Your choice is sealed — hashed on submission, revealed only after the window closes. Nobody sees the votes. Not even us until it&apos;s over. The audience signal bar? Non-binding. The crowd might be bluffing.</p></div>
            </Reveal>
            <Reveal className="how-it-works-step" delay={0.18}>
              <span>04</span>
              <div><h3>04 — THE BOX OPENS. OR IT DOESN&apos;T.</h3><p>Hodlers hold the line (70%+) → the box opens. Hodlers split the pot by bag × streak. Streaks tick up.<br />You took NO HODL and they held anyway → you get the defector&apos;s deal: 1.5x weight from a capped tranche. But your streak drops a tier. Money now, compounding later. Pick one.<br />Too many fold → nobody gets paid. The pot rolls into the next box. Bigger box, same question.</p></div>
            </Reveal>
            <Reveal className="how-it-works-step" delay={0.24}>
              <span>05</span>
              <div><h3>05 — YOU DON&apos;T EVEN HAVE TO SHOW UP.</h3><p>Silence counts as HODL at full weight. Voting HODL yourself earns a small bonus. But sell during a round and it doesn&apos;t matter what you clicked — <strong>selling is NO HODL. Streak gone. No deal. Sell and you&apos;re out. Defect and you&apos;re paid.</strong></p><p>Payouts hit wallets automatically. No claiming. Then the next episode begins.</p></div>
            </Reveal>
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
            {tokenMint ? <button type="button" onClick={() => void navigator.clipboard?.writeText(tokenMint).then(() => showUiNotice("Contract copied."))}>Copy CA</button> : null}
          </div>
          <div className="footer-status"><span>BANKER STATUS <b>AWAITING FIRST CALL</b></span></div>
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
