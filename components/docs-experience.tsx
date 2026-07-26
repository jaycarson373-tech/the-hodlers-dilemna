import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";

const timeline = [
  ["ROUND OPEN", "CARDS PRINT", "Every eligible 1M-token block becomes a live ticket."],
  ["POOL FILLS", "FEES ARRIVE", "Creator fees keep feeding the main bingo pool and jackpot pool."],
  ["SPINNER LIVE", "CARDS MARK", "The live board updates while wallets watch their tickets."],
  ["BINGO HIT", "WINNER FOUND", "One wallet card hits the winning pattern and takes the round."],
  ["BONUS CHECK", "JACKPOT SPIN", "Rare rounds trigger a second jackpot reveal after the normal win."],
] as const;

const ladder = [
  ["New wallet", "Base weight", "Paper Card"], ["1 hour", "+20% boost", "Paper Card"], ["2 hours", "+50% boost", "Iron Card"],
  ["6 hours", "2.0× weight", "Iron Card"], ["1 day", "2.5× weight", "Diamond Card"], ["3 days", "3.0× weight", "Diamond Card"], ["7 days", "4.0× cap", "Obsidian Card"],
] as const;

export function DocsExperience() {
  return (
    <main className="docs-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/rules">Rules</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>

      <section className="docs-intro"><span>OFFICIAL DOCUMENTATION</span><h1>ON-CHAIN<br /><em>BINGO</em></h1><p>The game is intentionally simple: every 1M $DILEMMA becomes a ticket, creator fees fund the prize pools, and the board reveals a winning wallet.</p></section>

      <section className="docs-section"><header><span>01 / CORE LOOP</span><h2>ONE BOARD. MANY CARDS. ONE WINNER.</h2></header><div className="docs-grid three"><article><b>1M TOKENS</b><strong>1 TICKET</strong><p>Every full 1,000,000 $DILEMMA held by a wallet becomes a bingo card on the live board.</p></article><article><b>SEARCH</b><strong>ZOOM</strong><p>Players can search a wallet and zoom into that wallet&apos;s card while the board expands around it.</p></article><article><b>FAST DRAW</b><strong>LIVE REVEAL</strong><p>The draw runs quickly, like live bingo. Winners should appear across a small run of rounds, not once a month.</p></article></div></section>

      <section className="docs-section"><header><span>02 / FUNDING SPLIT</span><h2>CREATOR FEES FUEL THE BOARD.</h2></header><div className="docs-grid two"><article><b>80%</b><strong>MAIN BINGO POOL</strong><p>The normal prize pool. When a card wins the live draw, the winner is paid from this pool.</p></article><article><b>20%</b><strong>JACKPOT POOL</strong><p>The bonus pool. Roughly one in 25 rounds can trigger a jackpot reveal after the normal win.</p></article></div></section>

      <section className="docs-section"><header><span>03 / TIMELINE</span><h2>THE SIGNAL GETS HARDER TO TRUST.</h2></header><div className="docs-timeline">{timeline.map(([time,title,copy]) => <article key={`${time}-${title}`}><time>{time}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section className="docs-section"><header><span>04 / ELIGIBILITY & WEIGHT</span><h2>YOUR BAG PRINTS YOUR TICKETS.</h2></header><div className="docs-grid two"><article><b>MINIMUM CARD</b><strong>1M+ $DILEMMA</strong><p>The connected wallet must hold at least 1,000,000 $DILEMMA for the active mint.</p></article><article><b>TICKET COUNT</b><strong>BALANCE ÷ 1M</strong><p>Each full 1M tokens becomes another chance on the board. Time held can still boost special card rewards.</p></article></div><div className="docs-callout">The live board is wallet-first: bigger committed balances occupy more card space.</div></section>

      <section className="docs-section"><header><span>05 / TIME-HELD BOOST</span><h2>CONVICTION STILL MATTERS.</h2></header><div className="docs-table"><div><b>HELD FOR</b><b>BOOST</b><b>TIER</b></div>{ladder.map(([held,boost,tier]) => <div key={held}><span>{held}</span><strong>{boost}</strong><span>{tier}</span></div>)}</div><p className="docs-note">There are no extra payout gimmicks layered on top. Winning splits are based on holding weight: balance first, then the time-held boost for wallets that stay in.</p></section>

      <section className="docs-section"><header><span>06 / LIVE BOARD</span><h2>THE BOARD IS MEANT TO BE WATCHED.</h2></header><div className="docs-grid three"><article><b>EXPANDS</b><p>As more eligible wallets enter, the card wall grows without hiding the main draw.</p></article><article><b>SEARCHABLE</b><p>Search a wallet to zoom into that player card.</p></article><article><b>LIVE</b><p>Cards, pool, timer, and winner state update from the live protocol feed.</p></article></div><div className="docs-callout">No fake holder stats. If the board is empty, it says it is empty.</div></section>

      <section className="docs-section"><header><span>07 / SETTLEMENT</span><h2>BINGO HITS. WINNER PAID.</h2></header><div className="docs-grid two"><article><b>NORMAL WIN</b><strong>MAIN POOL</strong><p>The winning wallet receives the current main bingo pool in SOL.</p></article><article><b>JACKPOT HIT</b><strong>BONUS POOL</strong><p>When jackpot mode triggers, a second reveal can pay the jackpot pool after the normal winner.</p></article></div><div className="docs-formula">1M $DILEMMA = 1 TICKET · 80% MAIN POOL · 20% JACKPOT POOL</div></section>

      <section className="docs-section"><header><span>08 / CHAT & LEADERBOARD</span><h2>THE ROOM IS LIVE.</h2></header><div className="docs-grid two"><article><b>CHAT</b><p>Connected wallets can open the chat pop-up, pick a display name, and talk without exposing their full wallet in chat.</p></article><article><b>LEADERBOARD</b><p>The public leaderboard tracks wallet, tier, score, time-held boosts, total SOL paid, wins, and losses after settlement.</p></article></div></section>

      <section className="docs-end"><span>READY?</span><h2>FIND YOUR CARD.</h2><div><Link className="show-button show-button-red" href="/play">Enter Live Game</Link><Link className="show-button show-button-gold" href="/rules">One-Minute Rules</Link></div></section>
      <footer className="show-footer"><ShowBrand /><span>Full rules. Live rounds. Direct SOL settlement.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
