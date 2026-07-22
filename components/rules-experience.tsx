import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";

const chapters = [
  ["01", "THE POT", "FEES ENTER THE WHEEL.", "Every 30 minutes, the current fee pot resolves. The pot is paid only when SELL wins. If HOLD wins, it rolls forward."],
  ["02", "THE CHOICE", "HOLD OR SELL.", "HOLD means you stay in and let the pot grow. SELL means you are playing for the current round's fees."],
  ["03", "THE SIGNAL", "THE ROOM CAN BLUFF.", "Early signal is visible. At 10 minutes left it starts to blur. At 5 minutes it gets harder to read. At 1 minute it locks."],
  ["04", "IF SELL WINS", "SELLERS RECEIVE THE FEES.", "Eligible SELL voters split the round's fee pot by player weight. The round ends and the next one begins."],
  ["05", "IF HOLD WINS", "THE POT MOVES ON.", "Nobody is paid yet. The full pot rolls to the next round, and only wallets that held remain eligible to vote next round."],
  ["06", "THE REVEAL", "ONE SIDE WINS.", "At zero, the final hidden choices reveal. The board shows whether the round landed HOLD or SELL."],
] as const;

const ladder = [["NEW", "1.0×", "PAPER"], ["1 HOUR", "1.2×", "PAPER"], ["2 HOURS", "1.5×", "IRON"], ["6 HOURS", "2.0×", "IRON"], ["1 DAY", "2.5×", "DIAMOND"], ["3 DAYS", "3.0×", "DIAMOND"], ["7 DAYS", "4.0× CAP", "OBSIDIAN"]];

function RuleVisual({ number }: { number: string }) {
  if (number === "01") return <div className="rule-diagram fee"><strong>CREATOR FEES</strong><i>↓</i><span>LIVE POT<br /><b>30-MINUTE ROUND</b></span></div>;
  if (number === "02") return <div className="rule-diagram versus"><span>◆<b>HOLD</b><small>LET IT ROLL</small></span><i>OR</i><span>◇<b>SELL</b><small>PLAY FOR FEES</small></span></div>;
  if (number === "03") return <div className="rule-diagram line"><span>LIVE → BLUR → HEAVY BLUR → LOCK</span><i><b /></i><strong>10 MIN · 5 MIN · 1 MIN</strong></div>;
  if (number === "04") return <div className="rule-diagram math"><span>SELL WINS</span><i>→</i><strong>SELLERS SPLIT FEES</strong></div>;
  if (number === "05") return <div className="rule-diagram math"><span>HOLD WINS</span><i>→</i><strong>POT ROLLS FORWARD</strong></div>;
  return <div className="rule-ladder">{ladder.map(([held, multiplier, tier]) => <div key={held}><span>{held}</span><strong>{multiplier}</strong><b>{tier}</b></div>)}</div>;
}

export function RulesExperience() {
  return (
    <main className="rules-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/docs">Docs</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>
      <section className="rules-intro"><p>THE OFFICIAL RULES / ONE MINUTE</p><h1>HOLD.<br /><em>OR SELL.</em></h1><span>If SELL wins, sellers receive the fees. If HOLD wins, the pot rolls forward and the next round belongs to the holders who stayed.</span></section>
      {chapters.map(([number, eyebrow, title, copy]) => <section className="rules-chapter" key={number}><div className="rules-chapter-copy"><span>{number} / {eyebrow}</span><h2>{title}</h2><p>{copy}</p></div><RuleVisual number={number} /></section>)}
      <section className="rules-formula"><span>THE WHOLE GAME</span><h2>SELL WINS: FEES PAID.<br />HOLD WINS: POT ROLLS.</h2><p>The pressure is simple. Take the current round, or keep the wheel spinning.</p></section>
      <section className="rules-one-line"><p>$DILEMMA</p><h2>DO YOU HOLD...<br />OR DO YOU SELL?</h2><span>Everything else is timing, bluffing, and conviction.</span><Link className="show-button show-button-red" href="/play">Enter Live Game</Link></section>
      <footer className="show-footer"><ShowBrand /><span>Every 30 minutes. One dilemma.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
