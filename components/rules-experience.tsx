import Link from "next/link";
import { FooterBanner } from "@/components/footer-banner";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";

const chapters = [
  ["01", "THE POT", "FEES ENTER THE WHEEL.", "Every 15 minutes, creator fees are split: 65% main pot, 25% Banker fund, 10% airdrop fund. The pot pays only when JEET wins. If HOLD wins, it rolls forward."],
  ["02", "THE CHOICE", "HOLD OR JEET.", "HOLD means you stay in and let the pot grow. JEET means you are playing for the current round's fees."],
  ["03", "THE SIGNAL", "THE ROOM CAN BLUFF.", "Signal is visible for 10 minutes, then heavily obfuscated for 4 minutes, then locked in the final minute."],
  ["04", "IF JEET WINS", "JEETERS RECEIVE THE FEES.", "Eligible JEET voters split the round's fee pot by holding weight. Bigger bags carry more weight. Time held can boost that weight."],
  ["05", "IF HOLD WINS", "THE POT MOVES ON.", "Nobody is paid yet. The full pot rolls to the next round, and only wallets that held remain eligible to vote next round."],
  ["06", "THE REVEAL", "ONE SIDE WINS.", "At zero, the final hidden choices reveal. The board shows whether the round landed HOLD or JEET."],
] as const;

const ladder = [["NEW", "BASE", "PAPER"], ["1 HOUR", "+20%", "PAPER"], ["2 HOURS", "+50%", "IRON"], ["6 HOURS", "2.0×", "IRON"], ["1 DAY", "2.5×", "DIAMOND"], ["3 DAYS", "3.0×", "DIAMOND"], ["7 DAYS", "4.0× CAP", "OBSIDIAN"]];

function RuleVisual({ number }: { number: string }) {
  if (number === "01") return <div className="rule-diagram fee"><strong>CREATOR FEES</strong><i>↓</i><span>65% POT · 25% BANKER · 10% AIRDROP<br /><b>15-MINUTE ROUND</b></span></div>;
  if (number === "02") return <div className="rule-diagram versus"><span>◆<b>HOLD</b><small>LET IT ROLL</small></span><i>OR</i><span>◇<b>JEET</b><small>PLAY FOR FEES</small></span></div>;
  if (number === "03") return <div className="rule-diagram line"><span>LIVE → HEAVY BLUR → LOCK</span><i><b /></i><strong>10 MIN · 4 MIN · 1 MIN</strong></div>;
  if (number === "04") return <div className="rule-diagram math"><span>JEET WINS</span><i>→</i><strong>JEETERS SPLIT FEES</strong></div>;
  if (number === "05") return <div className="rule-diagram math"><span>HOLD WINS</span><i>→</i><strong>POT ROLLS FORWARD</strong></div>;
  return <div className="rule-ladder">{ladder.map(([held, boost, tier]) => <div key={held}><span>{held}</span><strong>{boost}</strong><b>{tier}</b></div>)}</div>;
}

export function RulesExperience() {
  return (
    <main className="rules-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/docs">Docs</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>
      <section className="rules-intro"><p>THE OFFICIAL RULES / ONE MINUTE</p><h1>HOLD.<br /><em>OR JEET.</em></h1><span>If JEET wins, jeeters receive the fees. If HOLD wins, the pot rolls forward and the next round belongs to the holders who stayed.</span></section>
      {chapters.map(([number, eyebrow, title, copy]) => <section className="rules-chapter" key={number}><div className="rules-chapter-copy"><span>{number} / {eyebrow}</span><h2>{title}</h2><p>{copy}</p></div><RuleVisual number={number} /></section>)}
      <section className="rules-formula"><span>THE WHOLE GAME</span><h2>JEET WINS: FEES PAID.<br />HOLD WINS: POT ROLLS.</h2><p>The pressure is simple. Take the current round, or keep the wheel spinning.</p></section>
      <section className="rules-one-line"><p>$DILEMMA</p><h2>DO YOU HOLD...<br />OR DO YOU JEET?</h2><span>Everything else is timing, bluffing, and conviction.</span><Link className="show-button show-button-red" href="/play">Enter Live Game</Link></section>
      <FooterBanner />
      <footer className="show-footer"><ShowBrand /><span>Every 15 minutes. One dilemma.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
