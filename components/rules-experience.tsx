import Link from "next/link";
import { ShowBrand } from "@/components/show-brand";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";

const chapters = [
  ["01", "THE BOX", "EVERY EPISODE HAS ONE PRIZE.", "Creator fees enter The Box every 15 minutes. The live Box is the total prize before accepted Banker deals are paid."],
  ["02", "THE BANKER'S OFFER", "A REAL NUMBER. FULLY FUNDED.", "Before choices open, every eligible wallet receives its own exact offer. All posted offers are reserved in advance, and accepted deals can never exceed 30% of The Box."],
  ["03", "HODL OR TAKE THE DEAL", "CERTAINTY OR THE BOX.", "Take the posted deal for guaranteed money and reset your streak—or reject it, HODL, and play for the remaining Box. Choices stay sealed until the Reveal."],
  ["04", "THE 70% LINE", "THE CROWD IS WEIGHTED.", "Weight equals token balance × multiplier. When at least 70% of weighted decisions are HODL, the crowd holds and The Box opens. Silence counts as HODL."],
  ["05", "WHEN THE CROWD HOLDS", "DEALS FIRST. HODL SPLITS THE REST.", "Accepted Banker deals are paid first. HODL players then split every remaining lamport by their share of total HODL weight."],
  ["06", "WHEN THE CROWD FAILS", "THE BOX STAYS SEALED.", "Accepted deals are still paid. HODL players receive nothing this episode. Only the unpaid balance rolls into the next Box."],
  ["07", "ROLLOVER", "FAILURE MAKES THE NEXT BOX BIGGER.", "A 10 SOL Box pays 3 SOL in accepted deals and fails. 7 SOL rolls forward. Add 4 SOL in new fees and the next Box begins at 11 SOL."],
  ["08", "STREAKS & MULTIPLIERS", "CONVICTION INCREASES YOUR WEIGHT.", "Hold longer to climb from Paper to Obsidian Hands. Your multiplier affects voting weight and HODL payouts, never the posted deal budget cap."],
  ["09", "SELLING", "SELLING COUNTS AS NO HODL.", "Any balance decrease during an active episode overrides your sealed decision, removes you from the HODL payout, and resets your streak to 1.0×."],
  ["10", "THREE-FAILURE FORCE OPEN", "THE JACKPOT CANNOT STAY SHUT FOREVER.", "After three consecutive failed episodes, the next episode force-opens. Accepted deals are still paid first; HODL players split the remaining Box and the failure counter resets."],
] as const;

const ladder = [["UNDER 1 HOUR", "1.0×", "PAPER"], ["1 HOUR", "1.2×", "PAPER"], ["2 HOURS", "1.5×", "IRON"], ["6 HOURS", "2.0×", "IRON"], ["1 DAY", "2.5×", "DIAMOND"], ["3 DAYS", "3.0×", "DIAMOND"], ["7 DAYS", "4.0× CAP", "OBSIDIAN"]];

function RuleVisual({ number }: { number: string }) {
  if (number === "01") return <div className="rule-diagram fee"><strong>CREATOR FEES</strong><i>↓</i><span>THE BOX<br /><b>FILLS EVERY 15 MINUTES</b></span></div>;
  if (number === "02") return <div className="rule-diagram offer"><small>YOUR FUNDED OFFER</small><strong>TAKE 0.07 SOL</strong><span>ALL ACCEPTED DEALS ≤ 30% OF THE BOX</span></div>;
  if (number === "03") return <div className="rule-diagram versus"><span>📦<b>HODL</b><small>PLAY FOR THE BOX</small></span><i>OR</i><span>☎<b>TAKE THE DEAL</b><small>GUARANTEED OFFER</small></span></div>;
  if (number === "04") return <div className="rule-diagram line"><span>WEIGHT = BALANCE × MULTIPLIER</span><i><b /></i><strong>70% HODL → BOX OPENS</strong></div>;
  if (number === "05") return <div className="rule-diagram math"><span>10 SOL BOX</span><i>−</i><span>1.5 SOL DEALS</span><i>=</i><strong>8.5 SOL FOR HODL</strong></div>;
  if (number === "06") return <div className="rule-diagram math"><span>10 SOL BOX</span><i>−</i><span>3 SOL DEALS</span><i>=</i><strong>7 SOL ROLLOVER</strong></div>;
  if (number === "07") return <div className="rule-diagram math"><span>7 SOL ROLLOVER</span><i>+</i><span>4 SOL NEW FEES</span><i>=</i><strong>11 SOL BOX</strong></div>;
  if (number === "08") return <div className="rule-ladder">{ladder.map(([held, multiplier, tier]) => <div key={held}><span>{held}</span><strong>{multiplier}</strong><b>{tier}</b></div>)}</div>;
  if (number === "09") return <div className="rule-diagram out"><strong>SELL / TRANSFER OUT</strong><i>→</i><span>NO HODL<br /><b>STREAK RESET</b></span></div>;
  return <div className="rule-diagram force"><span>FAIL 1</span><i>→</i><span>FAIL 2</span><i>→</i><span>FAIL 3</span><i>→</i><strong>FORCE OPEN</strong></div>;
}

export function RulesExperience() {
  return (
    <main className="rules-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>
      <section className="rules-intro"><p>THE OFFICIAL RULES / ONE MINUTE</p><h1>TAKE THE DEAL.<br /><em>OR PLAY FOR THE BOX.</em></h1><span>Every 15 minutes, the Banker presents a funded offer. If enough weighted holders reject it, The Box opens.</span></section>
      {chapters.map(([number, eyebrow, title, copy]) => <section className="rules-chapter" key={number}><div className="rules-chapter-copy"><span>{number} / {eyebrow}</span><h2>{title}</h2><p>{copy}</p></div><RuleVisual number={number} /></section>)}
      <section className="rules-formula"><span>THE PAYOUT FORMULA</span><h2>YOUR HODL WEIGHT ÷ TOTAL HODL WEIGHT × REMAINING BOX</h2><p>Remaining Box = starting Box − all accepted, fully funded Banker offers.</p></section>
      <section className="rules-one-line"><p>THAT&apos;S THE GAME.</p><h2>TAKE GUARANTEED MONEY—OR TRUST THE ROOM TO OPEN THE BOX.</h2><span>Everything else is strategy.</span><Link className="show-button show-button-red" href="/play">Enter Live Game</Link></section>
      <footer className="show-footer"><ShowBrand /><span>Every holder eventually faces the Banker.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
