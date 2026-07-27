import type { Metadata } from "next";
import Link from "next/link";
import { BingoLiveHall } from "@/components/bingo-live-hall";
import { ShowBrand } from "@/components/show-brand";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { TICKER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Live Hall | Bingo.fun",
  description: `Enter the live Solana bingo board. Every 1M ${TICKER} becomes a ticket.`,
};

export default function PlayPage() {
  const launchState = process.env.LAUNCH_STATE === "live" ? "live" : "prelaunch";
  return (
    <main className="broadcast-page">
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav">
        <ShowBrand />
        <nav aria-label="Game room navigation"><Link href="/">Home</Link><Link href="/rules">How It Works</Link><Link href="/leaderboard">Winners</Link><LaunchNavLinks /></nav>
      </header>
      <BingoLiveHall launchState={launchState} variant="game" />
      <footer className="broadcast-footer">
        <div><ShowBrand /><span>Every 1M tokens becomes a live bingo card.</span><Link href="/rules">How It Works</Link><LaunchFooterLinks /></div>
      </footer>
    </main>
  );
}
