import type { Metadata } from "next";
import Link from "next/link";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { PublicLeaderboardBoard } from "@/components/public-leaderboard-board";
import { ShowBrand } from "@/components/show-brand";
import { WalletConnect } from "@/components/wallet-connect";

export const metadata: Metadata = {
  title: "Leaderboard | Hodl or No Hodl.fun",
  description: "The public Hodl or No Hodl leaderboard: wallet, score, tier, total SOL paid, wins, and losses.",
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
          <WalletConnect />
        </nav>
      </header>
      <PublicLeaderboardBoard limit={50} />
      <footer className="broadcast-footer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hodl-no-hodl-banner-v2.jpg" alt="Hodl or No Hodl" width="1280" height="426" />
        <div>
          <ShowBrand />
          <span>The public board updates after every settlement.</span>
          <Link href="/play">Enter the Game</Link>
          <LaunchFooterLinks />
        </div>
      </footer>
    </main>
  );
}
