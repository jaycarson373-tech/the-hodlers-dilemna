import type { Metadata } from "next";
import Link from "next/link";
import { ProtocolConsole } from "@/components/protocol-console";
import { ShowBrand } from "@/components/show-brand";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { WalletConnect } from "@/components/wallet-connect";

export const metadata: Metadata = {
  title: "Live Game | Holders Dilemma",
  description: "Enter the live 30-minute Holders Dilemma round. Choose HOLD or SELL before the reveal.",
};

export default function PlayPage() {
  return (
    <main className="broadcast-page">
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav">
        <ShowBrand />
        <nav aria-label="Game room navigation"><Link href="/">Home</Link><Link href="/rules">Rules</Link><Link href="/leaderboard">Leaderboard</Link><LaunchNavLinks /><WalletConnect /></nav>
      </header>
      <ProtocolConsole />
      <footer className="broadcast-footer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holders-dilemma-og.png" alt="Holders Dilemma" width="1200" height="630" />
        <div><ShowBrand /><span>Every 30 minutes, every holder faces the same dilemma.</span><Link href="/rules">Read the Rules</Link><LaunchFooterLinks /></div>
      </footer>
    </main>
  );
}
