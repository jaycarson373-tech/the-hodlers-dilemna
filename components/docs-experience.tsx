import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";

const timeline = [
  ["00:00", "ROUND OPENS", "Eligible holders enter the board for a 30-minute round."],
  ["20:00 LEFT", "SIGNAL LIVE", "The public signal can move and players can read the room."],
  ["10:00 LEFT", "SIGNAL BLURS", "Visible percentages become intentionally less exact."],
  ["05:00 LEFT", "HEAVY OBFUSCATION", "The room becomes hard to read. Late moves create uncertainty."],
  ["01:00 LEFT", "SIGNAL LOCK", "The public signal freezes. Final choices stay hidden."],
  ["00:00", "THE REVEAL", "Final choices are revealed and the round lands HOLD or SELL."],
] as const;

const ladder = [
  ["New holder", "1.0×", "Paper Hands"], ["1 hour", "1.2×", "Paper Hands"], ["2 hours", "1.5×", "Iron Hands"],
  ["6 hours", "2.0×", "Iron Hands"], ["1 day", "2.5×", "Diamond Hands"], ["3 days", "3.0×", "Diamond Hands"], ["7 days", "4.0× cap", "Obsidian Hands"],
] as const;

export function DocsExperience() {
  return (
    <main className="docs-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/rules">Rules</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>

      <section className="docs-intro"><span>OFFICIAL DOCUMENTATION</span><h1>HOLDERS<br /><em>DILEMMA</em></h1><p>The game is intentionally simple: every 30 minutes, the room chooses HOLD or SELL. SELL wins pays the fees. HOLD wins rolls the pot forward and tightens the next board.</p></section>

      <section className="docs-section"><header><span>01 / CORE LOOP</span><h2>ONE POT. TWO SIDES. ONE REVEAL.</h2></header><div className="docs-grid three"><article><b>HOLD</b><strong>ROLL</strong><p>If HOLD wins, the fee pot moves into the next round. Only wallets that held stay eligible for that next vote.</p></article><article><b>SELL</b><strong>PAY</strong><p>If SELL wins, eligible SELL voters split the current fee pot in SOL by player weight.</p></article><article><b>ROUND LENGTH</b><strong>30 MIN</strong><p>The board resolves every 30 minutes. The countdown on the homepage and game page points to the reveal.</p></article></div></section>

      <section className="docs-section"><header><span>02 / TIMELINE</span><h2>THE SIGNAL GETS HARDER TO TRUST.</h2></header><div className="docs-timeline">{timeline.map(([time,title,copy]) => <article key={`${time}-${title}`}><time>{time}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section className="docs-section"><header><span>03 / ELIGIBILITY & WEIGHT</span><h2>YOUR BAG SETS THE BASE. YOUR STREAK ADDS FORCE.</h2></header><div className="docs-grid two"><article><b>MINIMUM SEAT</b><strong>CONFIGURED TOKENS</strong><p>The connected wallet must hold the configured minimum amount of $DILEMMA for the active mint.</p></article><article><b>PLAYER WEIGHT</b><strong>BALANCE × MULTIPLIER</strong><p>Votes and payout shares use weighted positions, not one-wallet-one-vote.</p></article></div><div className="docs-callout">If HOLD wins, the next round is holder-only: the wallets that stayed on HOLD remain on the board.</div></section>

      <section className="docs-section"><header><span>04 / MULTIPLIERS</span><h2>CONVICTION STILL MATTERS.</h2></header><div className="docs-table"><div><b>HELD FOR</b><b>MULTIPLIER</b><b>TIER</b></div>{ladder.map(([held,multiplier,tier]) => <div key={held}><span>{held}</span><strong>{multiplier}</strong><span>{tier}</span></div>)}</div><p className="docs-note">Multipliers increase player weight. Weight affects both the public result and the size of a SELL-side payout when SELL wins.</p></section>

      <section className="docs-section"><header><span>05 / SIGNAL RULES</span><h2>THE SIGNAL IS INFORMATION, NOT CERTAINTY.</h2></header><div className="docs-grid three"><article><b>LIVE</b><p>Before the final 10 minutes, the audience signal can show HOLD / SELL movement.</p></article><article><b>OBFUSCATED</b><p>At 10 minutes it blurs. At 5 minutes it gets heavily obfuscated.</p></article><article><b>LOCKED</b><p>At 1 minute, the visible signal freezes. Final choices remain hidden until reveal.</p></article></div><div className="docs-callout">Only each wallet&apos;s latest valid sealed choice counts at settlement.</div></section>

      <section className="docs-section"><header><span>06 / SETTLEMENT</span><h2>THE WHEEL LANDS HOLD OR SELL.</h2></header><div className="docs-grid two"><article><b>SELL WINS</b><strong>FEES PAID</strong><p>SELL voters split the current fee pot. HOLD voters receive nothing for that round.</p></article><article><b>HOLD WINS</b><strong>POT ROLLS</strong><p>No payout yet. The pot moves into the next round and only holders that stayed can vote next.</p></article></div><div className="docs-formula">PLAYER SELL WEIGHT ÷ TOTAL SELL WEIGHT × CURRENT POT = SELL WINNER PAYOUT</div></section>

      <section className="docs-section"><header><span>07 / CHAT & LEADERBOARD</span><h2>THE ROOM IS LIVE.</h2></header><div className="docs-grid two"><article><b>CHAT</b><p>Connected wallets can open the chat pop-up, pick a display name, and talk without exposing their full wallet in chat.</p></article><article><b>LEADERBOARD</b><p>The public leaderboard tracks wallet, tier, score, total SOL paid, wins, and losses after settlement.</p></article></div></section>

      <section className="docs-end"><span>READY?</span><h2>HOLD... OR SELL?</h2><div><Link className="show-button show-button-red" href="/play">Enter Live Game</Link><Link className="show-button show-button-gold" href="/rules">One-Minute Rules</Link></div></section>
      <footer className="show-footer"><ShowBrand /><span>Full rules. Live rounds. Direct SOL settlement.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
