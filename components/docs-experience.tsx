import Link from "next/link";
import { FooterBanner } from "@/components/footer-banner";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";

const timeline = [
  ["15:00", "ROUND OPENS", "Eligible holders enter the board for a 15-minute round."],
  ["10:00 LEFT", "SIGNAL LIVE", "The public signal can move and players can read the room."],
  ["04:00 LEFT", "HEAVY OBFUSCATION", "The room becomes hard to read. Late moves create uncertainty."],
  ["01:00 LEFT", "SIGNAL LOCK", "The public signal freezes. Final choices stay hidden."],
  ["00:00", "THE REVEAL", "Final choices are revealed and the round lands HOLD or JEET."],
] as const;

const ladder = [
  ["New holder", "Base weight", "Paper Hands"], ["1 hour", "+20% boost", "Paper Hands"], ["2 hours", "+50% boost", "Iron Hands"],
  ["6 hours", "2.0× weight", "Iron Hands"], ["1 day", "2.5× weight", "Diamond Hands"], ["3 days", "3.0× weight", "Diamond Hands"], ["7 days", "4.0× cap", "Obsidian Hands"],
] as const;

export function DocsExperience() {
  return (
    <main className="docs-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/rules">Rules</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>

      <section className="docs-intro"><span>OFFICIAL DOCUMENTATION</span><h1>HOLDERS<br /><em>DILEMMA</em></h1><p>The game is intentionally simple: every 15 minutes, the room chooses HOLD or JEET. JEET wins pays the fees. HOLD wins rolls the pot forward and tightens the next board.</p></section>

      <section className="docs-section"><header><span>01 / CORE LOOP</span><h2>ONE POT. TWO SIDES. ONE REVEAL.</h2></header><div className="docs-grid three"><article><b>HOLD</b><strong>ROLL</strong><p>If HOLD wins, the fee pot moves into the next round. Only wallets that held stay eligible for that next vote.</p></article><article><b>JEET</b><strong>PAY</strong><p>If JEET wins, eligible JEET voters split the current fee pot in SOL by holding weight.</p></article><article><b>ROUND LENGTH</b><strong>15 MIN</strong><p>The board resolves every 15 minutes. The countdown on the homepage and game page points to the reveal.</p></article></div></section>

      <section className="docs-section"><header><span>02 / FUNDING SPLIT</span><h2>CREATOR FEES FUEL THREE WALLETS.</h2></header><div className="docs-grid three"><article><b>65%</b><strong>MAIN POT</strong><p>The live pot that JEET voters split if JEET wins. If HOLD wins, this rolls forward.</p></article><article><b>25%</b><strong>BANKER FUND</strong><p>Funds occasional Banker calls when the pot is large enough and an offer is accepted.</p></article><article><b>10%</b><strong>AIRDROP FUND</strong><p>Funds airdrops for eligible 1M+ holders when Banker dynamics trigger.</p></article></div></section>

      <section className="docs-section"><header><span>03 / TIMELINE</span><h2>THE SIGNAL GETS HARDER TO TRUST.</h2></header><div className="docs-timeline">{timeline.map(([time,title,copy]) => <article key={`${time}-${title}`}><time>{time}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section className="docs-section"><header><span>04 / ELIGIBILITY & WEIGHT</span><h2>YOUR BAG SETS THE BASE. TIME HELD ADDS FORCE.</h2></header><div className="docs-grid two"><article><b>MINIMUM SEAT</b><strong>1M+ $DILEMMA</strong><p>The connected wallet must hold at least 1,000,000 $DILEMMA for the active mint.</p></article><article><b>HOLDING WEIGHT</b><strong>BALANCE × TIME-HELD BOOST</strong><p>Votes and payout shares use holding weight, not one-wallet-one-vote. Bag size is the base. Time held can boost the final weight.</p></article></div><div className="docs-callout">If HOLD wins, the next round is holder-only: the wallets that stayed on HOLD remain on the board.</div></section>

      <section className="docs-section"><header><span>05 / TIME-HELD BOOST</span><h2>CONVICTION STILL MATTERS.</h2></header><div className="docs-table"><div><b>HELD FOR</b><b>BOOST</b><b>TIER</b></div>{ladder.map(([held,boost,tier]) => <div key={held}><span>{held}</span><strong>{boost}</strong><span>{tier}</span></div>)}</div><p className="docs-note">There are no extra payout gimmicks layered on top. Winning splits are based on holding weight: balance first, then the time-held boost for wallets that stay in.</p></section>

      <section className="docs-section"><header><span>06 / SIGNAL RULES</span><h2>THE SIGNAL IS INFORMATION, NOT CERTAINTY.</h2></header><div className="docs-grid three"><article><b>LIVE</b><p>For the first 10 minutes, the audience signal can show HOLD / JEET movement.</p></article><article><b>OBFUSCATED</b><p>With 4 minutes left it gets heavily obfuscated.</p></article><article><b>LOCKED</b><p>At 1 minute, the visible signal freezes. Final choices remain hidden until reveal.</p></article></div><div className="docs-callout">Only each wallet&apos;s latest valid sealed choice counts at settlement.</div></section>

      <section className="docs-section"><header><span>07 / SETTLEMENT</span><h2>THE WHEEL LANDS HOLD OR JEET.</h2></header><div className="docs-grid two"><article><b>JEET WINS</b><strong>FEES PAID</strong><p>JEET voters split the current fee pot by holding weight. HOLD voters receive nothing for that round.</p></article><article><b>HOLD WINS</b><strong>POT ROLLS</strong><p>No payout yet. The pot moves into the next round and only holders that stayed can vote next.</p></article></div><div className="docs-formula">PLAYER HOLDING WEIGHT ÷ TOTAL WINNING-SIDE WEIGHT × CURRENT POT = WINNER PAYOUT</div></section>

      <section className="docs-section"><header><span>08 / CHAT & LEADERBOARD</span><h2>THE ROOM IS LIVE.</h2></header><div className="docs-grid two"><article><b>CHAT</b><p>Connected wallets can open the chat pop-up, pick a display name, and talk without exposing their full wallet in chat.</p></article><article><b>LEADERBOARD</b><p>The public leaderboard tracks wallet, tier, score, time-held boosts, total SOL paid, wins, and losses after settlement.</p></article></div></section>

      <section className="docs-end"><span>READY?</span><h2>HOLD... OR JEET?</h2><div><Link className="show-button show-button-red" href="/play">Enter Live Game</Link><Link className="show-button show-button-gold" href="/rules">One-Minute Rules</Link></div></section>
      <FooterBanner />
      <footer className="show-footer"><ShowBrand /><span>Full rules. Live rounds. Direct SOL settlement.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
