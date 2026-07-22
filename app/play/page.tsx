import type { Metadata } from "next";
import Link from "next/link";
import { ProtocolConsole } from "@/components/protocol-console";
import { ShowBrand } from "@/components/show-brand";
import { WalletConnect } from "@/components/wallet-connect";

export const metadata: Metadata = {
  title: "Live Game | Hodl or No Hodl.fun",
  description: "Enter the live 15-minute Hodl or No Hodl episode. See your Box, the Banker's funded offer, and your projected HODL payout.",
};

export default function PlayPage() {
  return (
    <main className="broadcast-page">
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav">
        <ShowBrand />
        <nav aria-label="Game room navigation"><Link href="/">Home</Link><Link href="/rules">Rules</Link><a href="#leaderboard">Leaderboard</a><WalletConnect /></nav>
      </header>
      <ProtocolConsole />
      <footer className="broadcast-footer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hodl-no-hodl-banner-v2.jpg" alt="Hodl or No Hodl" width="1254" height="426" />
        <div><ShowBrand /><span>Every 15 minutes, every holder faces the Banker.</span><Link href="/rules">Read the Rules</Link></div>
      </footer>
    </main>
  );
}
