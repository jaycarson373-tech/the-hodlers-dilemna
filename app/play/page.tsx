import type { Metadata } from "next";
import Link from "next/link";
import { ProtocolConsole } from "@/components/protocol-console";
import { ShowBrand } from "@/components/show-brand";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { WalletConnect } from "@/components/wallet-connect";
import { TICKER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Live Bingo | On-Chain Bingo",
  description: `Enter the live Solana bingo board. Every 1M ${TICKER} becomes a ticket.`,
};

export default function PlayPage() {
  const launchState = process.env.LAUNCH_STATE === "live" ? "live" : "prelaunch";
  return (
    <main className="broadcast-page">
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav">
        <ShowBrand />
        <nav aria-label="Game room navigation"><Link href="/">Home</Link><Link href="/rules">Rules</Link><Link href="/leaderboard">Leaderboard</Link><LaunchNavLinks /><WalletConnect /></nav>
      </header>
      <ProtocolConsole launchState={launchState} />
      <footer className="broadcast-footer">
        <div><ShowBrand /><span>Every 1M tokens becomes a live bingo ticket.</span><Link href="/rules">Read the Rules</Link><LaunchFooterLinks /></div>
      </footer>
    </main>
  );
}
