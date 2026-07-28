import type { Metadata } from "next";
import { BingoLiveHall } from "@/components/bingo-live-hall";
import { ShowBrand } from "@/components/show-brand";
import { TICKER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "The Blue Hall | Bingo Royale",
  description: `Enter the live Solana bingo board. Every 2M ${TICKER} becomes a card.`,
};

export default function PlayPage() {
  const launchState = "live" as const;
  return (
    <main className="broadcast-page">
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav broadcast-hall-nav">
        <ShowBrand />
        <span>THE BLUE HALL · LIVE ON SOLANA</span>
      </header>
      <BingoLiveHall launchState={launchState} variant="game" />
      <footer className="broadcast-footer broadcast-hall-footer">THE HALL</footer>
    </main>
  );
}
