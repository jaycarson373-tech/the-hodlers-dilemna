import Link from "next/link";
import { ShowBrand } from "@/components/show-brand";

const sections = [
  {
    number: "01",
    eyebrow: "THE BOX",
    title: "THE PRIZE KEEPS GROWING.",
    copy: "Every 15 minutes, creator fees fill The Box. This is what every player is competing for.",
    visual: "split",
  },
  {
    number: "02",
    eyebrow: "YOUR BOX",
    title: "YOUR HOLDING POWER, LIVE.",
    copy: "Connect your wallet to see your balance, streak, multiplier, and projected share update as The Box grows.",
    visual: "wallet",
  },
  {
    number: "03",
    eyebrow: "THE BANKER'S OFFER",
    title: "GUARANTEED MONEY. ONE DECISION.",
    copy: "Near the end of the round, the Banker posts one guaranteed offer for everyone. Choices stay secret until time expires.",
    visual: "offer",
  },
  {
    number: "04",
    eyebrow: "THE REVEAL",
    title: "DID THE ROOM HOLD THE LINE?",
    copy: "When the timer reaches zero, the choices are revealed. Weighted HODL must reach 70% for The Box to open.",
    visual: "reveal",
  },
  {
    number: "05",
    eyebrow: "WHAT HAPPENS?",
    title: "THREE OUTCOMES. NO CONFUSION.",
    copy: "Take certainty, play for the Box, or watch the jackpot survive. Your choice decides what happens to your streak.",
    visual: "outcomes",
  },
  {
    number: "06",
    eyebrow: "THE JACKPOT",
    title: "WHEN THE BOX STAYS CLOSED, IT GETS BIGGER.",
    copy: "A failed round rolls the entire Box forward. After three consecutive failures, the next round force-opens for HODL players.",
    visual: "jackpot",
  },
] as const;

function RulesVisual({ type }: { type: (typeof sections)[number]["visual"] }) {
  if (type === "split") return (
    <div className="rules-fee-flow" aria-label="Creator fees split 80 percent to The Box and 20 percent to the Banker Treasury">
      <strong>CREATOR FEES</strong><i>↓</i>
      <div><span><b>80%</b> THE BOX</span><span><b>20%</b> BANKER TREASURY</span></div>
    </div>
  );
  if (type === "wallet") return (
    <div className="rules-your-box">
      <div><span>BALANCE</span><strong>YOUR TOKENS</strong></div><div><span>STREAK</span><strong>TIME HELD</strong></div>
      <div><span>MULTIPLIER</span><strong>1.0× → 4.0×</strong></div><div className="wide"><span>PROJECTED SHARE</span><strong>GROWS WITH THE BOX</strong></div>
      <p>WEIGHT = BALANCE × MULTIPLIER</p>
    </div>
  );
  if (type === "offer") return (
    <div className="rules-offer-card">
      <span>☎ THE BANKER&apos;S OFFER</span><strong>TAKE 0.08 SOL NOW.</strong>
      <div><button type="button">TAKE THE DEAL</button><button type="button">📦 HODL</button></div>
      <p>ONE OFFER / SECRET CHOICES</p>
    </div>
  );
  if (type === "reveal") return (
    <div className="rules-reveal">
      <div><span>WEIGHTED HODL</span><strong>70%</strong></div>
      <i><b /></i>
      <div className="rules-reveal-outcomes"><span>70%+ → 📦 BOX OPENS</span><span>BELOW 70% → 🔒 BOX STAYS CLOSED</span></div>
    </div>
  );
  if (type === "outcomes") return (
    <div className="rules-outcome-cards">
      <article><span>TAKE THE DEAL</span><strong>GUARANTEED PAYOUT</strong><p>Streak resets. Multiplier returns to 1×.</p></article>
      <article><span>HODL + BOX OPENS</span><strong>WEIGHTED SHARE</strong><p>Paid from The Box. Streak and multiplier grow.</p></article>
      <article><span>HODL + BOX CLOSED</span><strong>NO PAYOUT YET</strong><p>Streak survives. The jackpot rolls over.</p></article>
    </div>
  );
  return (
    <div className="rules-jackpot">
      <span>ROUND 01<br /><b>BOX CLOSED</b></span><i>→</i><span>ROUND 02<br /><b>BIGGER BOX</b></span><i>→</i><span>ROUND 03<br /><b>MAXIMUM TENSION</b></span>
      <strong>3 FAILED ROUNDS → NEXT BOX FORCE-OPENS FOR HODL PLAYERS</strong>
    </div>
  );
}

export function RulesExperience() {
  return (
    <main className="rules-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav">
        <ShowBrand />
        <nav><Link href="/">Home</Link><Link href="/play">Enter Game</Link></nav>
      </header>

      <section className="rules-intro">
        <p>THE GAME / EXPLAINED IN 60 SECONDS</p>
        <h1>TAKE THE DEAL.<br /><em>OR PLAY FOR THE BOX.</em></h1>
        <span>Every 15 minutes, The Box grows. Near the end of the round, the Banker offers guaranteed money. What happens next depends on the room.</span>
      </section>

      {sections.map((section) => (
        <section className={`rules-chapter rules-chapter-${section.visual}`} key={section.number}>
          <div className="rules-chapter-copy">
            <span>{section.number} / {section.eyebrow}</span>
            <h2>{section.title}</h2>
            <p>{section.copy}</p>
            {section.visual === "outcomes" ? <small>Selling during an active round automatically counts as taking the deal. The blockchain is the source of truth.</small> : null}
          </div>
          <RulesVisual type={section.visual} />
        </section>
      ))}

      <section className="rules-one-line">
        <p>THAT&apos;S THE GAME.</p>
        <h2>TAKE GUARANTEED MONEY—OR REJECT IT AND TRUST THE ROOM TO OPEN THE BOX.</h2>
        <span>Everything else is strategy.</span>
        <Link className="show-button show-button-red" href="/play">Enter Live Game</Link>
      </section>
    </main>
  );
}
