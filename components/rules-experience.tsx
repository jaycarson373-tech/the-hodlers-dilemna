import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";
import { TICKER } from "@/lib/constants";

const chapters = [
  ["01", "THE BOARD", "EVERY WALLET GETS A CARD.", `Every 1,000,000 ${TICKER} in a wallet becomes one live bingo ticket. Bigger balances occupy more cards on the board.`],
  ["02", "THE POOL", "CREATOR FEES FUND THE DRAW.", "Creator fees are split 80% to the live bingo pool and 20% to the jackpot pool. The main pool pays normal winners. The jackpot pool waits for rare bonus rounds."],
  ["03", "THE SPINNER", "THE ROOM WATCHES THE DRAW.", "Fast rounds keep the board moving. The spinner calls cards until a wallet hits the winning pattern."],
  ["04", "THE WINNER", "ONE CARD TAKES THE ROUND.", "When a wallet wins, the main pool pays that wallet in SOL. The more tickets a wallet has, the more chances it has to appear on the board."],
  ["05", "THE JACKPOT", "SOME ROUNDS SPIN AGAIN.", "On rare jackpot rounds, a second reveal happens after the normal winner. The jackpot pool creates the bigger hit."],
  ["06", "YOUR CARD", "SEARCH. ZOOM. WATCH.", "Connect or search a wallet to find its ticket on the board. The interface zooms to that card so players can watch their spot live."],
] as const;

const ladder = [["NEW", "BASE", "PAPER"], ["1 HOUR", "+20%", "PAPER"], ["2 HOURS", "+50%", "IRON"], ["6 HOURS", "2.0×", "IRON"], ["1 DAY", "2.5×", "DIAMOND"], ["3 DAYS", "3.0×", "DIAMOND"], ["7 DAYS", "4.0× CAP", "OBSIDIAN"]];

function RuleVisual({ number }: { number: string }) {
  if (number === "01") return <div className="rule-diagram fee"><strong>1M TOKENS</strong><i>↓</i><span>1 LIVE BINGO TICKET<br /><b>WALLET = PLAYER CARD</b></span></div>;
  if (number === "02") return <div className="rule-diagram fee"><strong>CREATOR FEES</strong><i>↓</i><span>80% MAIN POOL · 20% JACKPOT<br /><b>FAST BINGO DRAW</b></span></div>;
  if (number === "03") return <div className="rule-diagram line"><span>SPIN → MARK → REVEAL</span><i><b /></i><strong>LIVE BOARD</strong></div>;
  if (number === "04") return <div className="rule-diagram math"><span>BINGO</span><i>→</i><strong>WINNER PAID</strong></div>;
  if (number === "05") return <div className="rule-diagram math"><span>RARE HIT</span><i>→</i><strong>JACKPOT SPIN</strong></div>;
  return <div className="rule-ladder">{ladder.map(([held, boost, tier]) => <div key={held}><span>{held}</span><strong>{boost}</strong><b>{tier}</b></div>)}</div>;
}

export function RulesExperience() {
  return (
    <main className="rules-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/docs">Docs</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>
      <section className="rules-intro"><p>THE OFFICIAL RULES / ONE MINUTE</p><h1>ON-CHAIN<br /><em>BINGO.</em></h1><span>Hold {TICKER}. Every 1M tokens becomes a ticket. Creator fees fund the board, the spinner calls the round, and the winning wallet takes the pool.</span></section>
      {chapters.map(([number, eyebrow, title, copy]) => <section className="rules-chapter" key={number}><div className="rules-chapter-copy"><span>{number} / {eyebrow}</span><h2>{title}</h2><p>{copy}</p></div><RuleVisual number={number} /></section>)}
      <section className="rules-formula"><span>THE WHOLE GAME</span><h2>1M TOKENS = 1 TICKET.<br />ONE BOARD. ONE WINNER.</h2><p>The pressure is simple. Find your card, watch the spin, wait for the reveal.</p></section>
      <section className="rules-one-line"><p>{TICKER}</p><h2>IS YOUR CARD<br />ON THE BOARD?</h2><span>Every fast round turns your wallet into a live bingo ticket.</span><Link className="show-button show-button-red" href="/play">Enter Live Game</Link></section>
      <footer className="show-footer"><ShowBrand /><span>On-chain bingo. Holder cards. Creator-fee prizes.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
