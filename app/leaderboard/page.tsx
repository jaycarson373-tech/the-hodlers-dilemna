import type { Metadata } from "next";
import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { PublicLeaderboardBoard } from "@/components/public-leaderboard-board";
import { ShowBrand } from "@/components/show-brand";

export const metadata: Metadata = {
  title: "Leaderboard | On-Chain Bingo",
  description: "The public On-Chain Bingo leaderboard: wallet, cards, total SOL paid, wins, and jackpots.",
};

export default function LeaderboardPage() {
  return (
    <main className="broadcast-page leaderboard-page">
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav">
        <ShowBrand />
        <nav aria-label="Leaderboard navigation">
          <Link href="/">Home</Link>
          <Link href="/play">Game</Link>
          <Link href="/rules">Rules</Link>
          <Link href="/docs">Docs</Link>
          <LaunchNavLinks />
        </nav>
      </header>
      <PublicLeaderboardBoard limit={50} />
      <footer className="broadcast-footer">
        <div>
          <ShowBrand />
          <span>The public bingo board updates after every settlement.</span>
          <Link href="/play">Enter the Game</Link>
          <LaunchFooterLinks />
        </div>
      </footer>
    </main>
  );
}
