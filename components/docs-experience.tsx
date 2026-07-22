import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";

const timeline = [
  ["00:00", "EPISODE OPENS", "Eligible balances are snapshotted. New buys count in the next episode."],
  ["ALL ROUND", "THE BOX FILLS", "Creator fees sweep every 15 minutes: 80% to The Box, 20% to the Banker Reserve."],
  ["FINAL WINDOW", "THE BANKER CALLS", "Every eligible wallet sees a fully funded offer and may choose HODL or NO HODL."],
  ["FINAL 60 SEC", "SIGNAL LOCKED", "The visible signal freezes. Players may still change their sealed final decision."],
  ["00:00", "THE REVEAL", "Final choices are revealed, weighted, settled, and paid automatically in SOL."],
] as const;

const ladder = [
  ["Under 1 hour", "1.0×", "Paper Hands"], ["1 hour", "1.2×", "Paper Hands"], ["2 hours", "1.5×", "Iron Hands"],
  ["6 hours", "2.0×", "Iron Hands"], ["1 day", "2.5×", "Diamond Hands"], ["3 days", "3.0×", "Diamond Hands"], ["7 days", "4.0× cap", "Obsidian Hands"],
] as const;

export function DocsExperience() {
  return (
    <main className="docs-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/rules">Rules</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>

      <section className="docs-intro"><span>OFFICIAL DOCUMENTATION</span><h1>THE ENTIRE EPISODE.<br /><em>NO HIDDEN RULES.</em></h1><p>Rules is the one-minute version. This page documents exactly how eligibility, offers, choices, settlement, rollover, and SOL payouts work.</p></section>

      <section className="docs-section"><header><span>01 / THE CORE</span><h2>ONE BOX. ONE OFFER. ONE FINAL CHOICE.</h2></header><div className="docs-grid three"><article><b>THE BOX</b><strong>80%</strong><p>The prize pool. If the crowd holds, eligible HODL wallets split it by weight.</p></article><article><b>BANKER RESERVE</b><strong>20%</strong><p>A separate wallet funds posted NO HODL offers. It never borrows from The Box.</p></article><article><b>COOPERATION LINE</b><strong>70%</strong><p>At least 70% of total weighted final choices must be HODL for The Box to open.</p></article></div></section>

      <section className="docs-section"><header><span>02 / EPISODE TIMELINE</span><h2>EVERY STATE, IN ORDER.</h2></header><div className="docs-timeline">{timeline.map(([time,title,copy]) => <article key={`${time}-${title}`}><time>{time}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section className="docs-section"><header><span>03 / ELIGIBILITY & WEIGHT</span><h2>YOUR BAG SETS THE BASE. YOUR STREAK ADDS FORCE.</h2></header><div className="docs-grid two"><article><b>MINIMUM SEAT</b><strong>1,000,000 TOKENS</strong><p>The connected wallet must hold at least the configured minimum for the active mint. The snapshot at episode open determines payout balance.</p></article><article><b>PLAYER WEIGHT</b><strong>BALANCE × MULTIPLIER</strong><p>This same weight drives the 70% line and each HODL wallet&apos;s share of The Box. Dust wallets cannot swing the room.</p></article></div><div className="docs-callout">Buying more during an episode is allowed, but those new tokens enter the next snapshot. Selling or transferring any amount out forces NO HODL and resets the streak.</div></section>

      <section className="docs-section"><header><span>04 / MULTIPLIERS</span><h2>CONVICTION COMPOUNDS.</h2></header><div className="docs-table"><div><b>HELD FOR</b><b>MULTIPLIER</b><b>TIER</b></div>{ladder.map(([held,multiplier,tier]) => <div key={held}><span>{held}</span><strong>{multiplier}</strong><span>{tier}</span></div>)}</div><p className="docs-note">One balance decrease resets the streak to 1.0×. Adding tokens never resets it.</p></section>

      <section className="docs-section"><header><span>05 / THE BANKER&apos;S OFFER</span><h2>THE NUMBER ON SCREEN IS FUNDED.</h2></header><div className="docs-grid two"><article><b>HOW IT IS SIZED</b><p>Before choices open, the available Banker Reserve is allocated across eligible wallets by snapshot weight. Combined posted offers cannot exceed spendable reserve balance.</p></article><article><b>IF YOU ACCEPT</b><p>Your final choice becomes NO HODL. The Banker Reserve pays the displayed offer in SOL, and your streak returns to 1.0×.</p></article></div><div className="docs-callout red">Banker deals come from the Banker Reserve. HODL rewards come from The Box. The two balances never cover each other.</div></section>

      <section className="docs-section"><header><span>06 / SEALED CHOICES & SIGNAL</span><h2>THE ROOM CAN BLUFF. THE REVEAL CANNOT.</h2></header><div className="docs-grid three"><article><b>LIVE SIGNAL</b><p>During most of the choice window, the public Audience Signal shows live sentiment. It is not the final vote.</p></article><article><b>FINAL MINUTE</b><p>At 60 seconds, the visible percentages lock. Players may still change decisions, but changes stay hidden.</p></article><article><b>FINAL CHOICE</b><p>Only each wallet&apos;s latest valid sealed choice counts. At zero, commitments reveal and the true weighted result replaces the signal.</p></article></div><div className="docs-callout">Silence counts as HODL. The audience poll is separate from the sealed game decision.</div></section>

      <section className="docs-section"><header><span>07 / SETTLEMENT</span><h2>THE BOX OPENS—OR GETS BIGGER.</h2></header><div className="docs-grid two"><article><b>70% OR MORE HODL</b><strong>THE BOX OPENS</strong><p>Accepted Banker deals are paid from the reserve. HODL wallets split the full Box in proportion to their HODL weight. Their streaks survive and grow.</p></article><article><b>BELOW 70% HODL</b><strong>THE BOX STAYS CLOSED</strong><p>Banker deals are still paid from the reserve. HODL wallets receive nothing this episode. The full unpaid Box rolls into the next episode.</p></article></div><div className="docs-formula">PLAYER HODL WEIGHT ÷ TOTAL HODL WEIGHT × THE BOX = PLAYER SOL PAYOUT</div></section>

      <section className="docs-section"><header><span>08 / ROLLOVER & FORCE OPEN</span><h2>FAILED ROOMS BUILD BIGGER BOXES.</h2></header><div className="docs-example"><span>8 SOL ROLLOVER</span><i>+</i><span>3.2 SOL NEW BOX FEES</span><i>=</i><strong>11.2 SOL NEXT BOX</strong></div><p className="docs-note">After three consecutive failed episodes, the next episode force-opens. The threshold is ignored; HODL wallets split The Box, Banker deals remain funded separately, and the failure counter resets.</p></section>

      <section className="docs-section"><header><span>09 / PAYOUT SAFETY</span><h2>PLAN FIRST. BROADCAST ONCE.</h2></header><div className="docs-grid three"><article><b>AUDIT BEFORE SEND</b><p>Every intended transfer receives an audit record before any transaction can be broadcast.</p></article><article><b>DRY RUN REQUIRED</b><p>Settlement first produces the complete payout plan with sending disabled. Live payout requires an approved dry-run record.</p></article><article><b>NO DOUBLE PAY</b><p>Every payment uses an episode, payout type, and wallet idempotency key. Re-running settlement cannot pay twice.</p></article></div><div className="docs-callout">Payouts arrive directly in SOL. There is no claim button and wallet authentication never requests token approval.</div></section>

      <section className="docs-end"><span>READY FOR THE CALL?</span><h2>HODL... OR NO HODL?</h2><div><Link className="show-button show-button-red" href="/play">Enter Live Game</Link><Link className="show-button show-button-gold" href="/rules">One-Minute Rules</Link></div></section>
      <footer className="show-footer"><ShowBrand /><span>Full rules. Sealed choices. Direct SOL settlement.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
