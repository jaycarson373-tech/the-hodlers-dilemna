import type { Metadata } from "next";
import Link from "next/link";
import { ProtocolConsole } from "@/components/protocol-console";
import { ShowBrand } from "@/components/show-brand";
import { LaunchFooterLinks, LaunchNavLinks } from "@/components/launch-links";
import { WalletConnect } from "@/components/wallet-connect";

export const metadata: Metadata = {
  title: "Live Bingo | On-Chain Bingo",
  description: "Enter the live Solana bingo board. Every 1M $DILEMMA becomes a ticket.",
};

export default function PlayPage() {
  return (
    <main className="broadcast-page">
      <div className="supplied-pill-backdrop" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holders-dilemma-pills-bg.jpg" alt="" decoding="async" fetchPriority="high" />
      </div>
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav">
        <ShowBrand />
        <nav aria-label="Game room navigation"><Link href="/">Home</Link><Link href="/rules">Rules</Link><Link href="/leaderboard">Leaderboard</Link><LaunchNavLinks /><WalletConnect /></nav>
      </header>
      <ProtocolConsole />
      <footer className="broadcast-footer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holders-dilemma-banner.png" alt="On-Chain Bingo" width="1280" height="426" loading="lazy" decoding="async" />
        <div><ShowBrand /><span>Every 1M tokens becomes a live bingo ticket.</span><Link href="/rules">Read the Rules</Link><LaunchFooterLinks /></div>
      </footer>
    </main>
  );
}
