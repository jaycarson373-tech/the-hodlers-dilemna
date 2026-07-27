import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { ShowBrand } from "@/components/show-brand";
import { TICKER } from "@/lib/constants";

const timeline = [
  ["ROUND OPEN", "CARDS PRINT", "Every eligible 1M-token block becomes a live ticket."],
  ["POOL FILLS", "FEES ARRIVE", "Creator fees keep feeding the main bingo pool and jackpot pool."],
  ["SPINNER LIVE", "CARDS MARK", "The live board updates while wallets watch their tickets."],
  ["BINGO HIT", "WINNER FOUND", "One wallet card hits the winning pattern and takes the round."],
  ["BONUS CHECK", "JACKPOT SPIN", "Rare rounds trigger a second jackpot reveal after the normal win."],
] as const;

export function DocsExperience() {
  return (
    <main className="docs-page">
      <div className="show-bulbs" aria-hidden="true" />
      <header className="rules-nav"><ShowBrand /><nav><Link href="/">Home</Link><Link href="/rules">Rules</Link><LaunchNavLinks /><Link className="show-button show-button-red" href="/play">Enter Game</Link></nav></header>

      <section className="docs-intro"><span>OFFICIAL DOCUMENTATION</span><h1>ON-CHAIN<br /><em>BINGO</em></h1><p>The game is intentionally simple: every 1M {TICKER} becomes a ticket, creator fees fund the prize pools, and the board reveals a winning wallet.</p></section>

      <section className="docs-section"><header><span>01 / CORE LOOP</span><h2>ONE BOARD. MANY CARDS. ONE WINNER.</h2></header><div className="docs-grid three"><article><b>1M TOKENS</b><strong>1 TICKET</strong><p>Every full 1,000,000 {TICKER} held by a wallet becomes a bingo card on the live board.</p></article><article><b>SEARCH</b><strong>ZOOM</strong><p>Players can search a wallet and zoom into that wallet&apos;s card while the board expands around it.</p></article><article><b>FAST DRAW</b><strong>LIVE REVEAL</strong><p>The draw runs quickly, like live bingo. Winners should appear across a small run of rounds, not once a month.</p></article></div></section>

      <section className="docs-section"><header><span>02 / FUNDING SPLIT</span><h2>CREATOR FEES FUEL THE BOARD.</h2></header><div className="docs-grid two"><article><b>80%</b><strong>MAIN BINGO POOL</strong><p>The normal prize pool. When a card wins the live draw, the winner is paid from this pool.</p></article><article><b>20%</b><strong>JACKPOT POOL</strong><p>The bonus pool. Roughly one in 25 rounds can trigger a jackpot reveal after the normal win.</p></article></div></section>

      <section className="docs-section"><header><span>03 / TIMELINE</span><h2>EVERY CALL BUILDS THE BOARD.</h2></header><div className="docs-timeline">{timeline.map(([time,title,copy]) => <article key={`${time}-${title}`}><time>{time}</time><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section className="docs-section"><header><span>04 / ELIGIBILITY</span><h2>YOUR BAG PRINTS YOUR TICKETS.</h2></header><div className="docs-grid two"><article><b>MINIMUM CARD</b><strong>1M+ {TICKER}</strong><p>The wallet must hold at least 1,000,000 {TICKER} when the game snapshot is taken.</p></article><article><b>TICKET COUNT</b><strong>BALANCE ÷ 1M</strong><p>Every complete 1M-token block prints one deterministic card for that game. Partial blocks do not count.</p></article></div><div className="docs-callout">No staking and no manual entry. The snapshot determines every wallet&apos;s exact card count.</div></section>

      <section className="docs-section"><header><span>05 / FAIR DRAW</span><h2>COMMIT FIRST. REVEAL AFTER.</h2></header><div className="docs-grid two"><article><b>GAME OPEN</b><strong>HASH PUBLISHED</strong><p>The worker commits to the hidden draw seed before calls begin.</p></article><article><b>GAME CLOSED</b><strong>SEED REVEALED</strong><p>The seed, calls, winning card, and settlement remain available for verification.</p></article></div><p className="docs-note">Cards and calls are deterministic from the committed seed. The worker cannot change the draw after the game opens.</p></section>

      <section className="docs-section"><header><span>06 / LIVE BOARD</span><h2>THE BOARD IS MEANT TO BE WATCHED.</h2></header><div className="docs-grid three"><article><b>EXPANDS</b><p>As more eligible wallets enter, the card wall grows without hiding the main draw.</p></article><article><b>SEARCHABLE</b><p>Search a wallet to zoom into that player card.</p></article><article><b>LIVE</b><p>Cards, pool, timer, and winner state update from the live protocol feed.</p></article></div><div className="docs-callout">No fake holder stats. If the board is empty, it says it is empty.</div></section>

      <section className="docs-section"><header><span>07 / SETTLEMENT</span><h2>BINGO HITS. WINNER PAID.</h2></header><div className="docs-grid two"><article><b>NORMAL WIN</b><strong>MAIN POOL</strong><p>The winning wallet receives the current main bingo pool in SOL.</p></article><article><b>JACKPOT HIT</b><strong>BONUS POOL</strong><p>When jackpot mode triggers, a second reveal can pay the jackpot pool after the normal winner.</p></article></div><div className="docs-formula">1M {TICKER} = 1 TICKET · 80% MAIN POOL · 20% JACKPOT POOL</div></section>

      <section className="docs-section"><header><span>08 / PUBLIC RECORD</span><h2>EVERY DRAW LEAVES A RECEIPT.</h2></header><div className="docs-grid two"><article><b>DRAW HISTORY</b><p>Settled games show the called numbers, winner, rollover, payout, and jackpot result.</p></article><article><b>LEADERBOARD</b><p>The public leaderboard ranks wallets by Bingo wins, total SOL paid, card count, and jackpot wins.</p></article></div></section>

      <section className="docs-end"><span>READY?</span><h2>FIND YOUR CARD.</h2><div><Link className="show-button show-button-red" href="/play">Enter Live Game</Link><Link className="show-button show-button-gold" href="/rules">One-Minute Rules</Link></div></section>
      <footer className="show-footer"><ShowBrand /><span>Full rules. Live rounds. Direct SOL settlement.</span><LaunchFooterLinks /></footer>
    </main>
  );
}
