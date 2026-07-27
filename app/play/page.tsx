import type { Metadata } from "next";
import { BingoLiveHall } from "@/components/bingo-live-hall";
import { ShowBrand } from "@/components/show-brand";
import { TICKER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Live Hall | Bingo Pump",
  description: `Enter the live Solana bingo board. Every 1M ${TICKER} becomes a ticket.`,
};

export default function PlayPage() {
  const launchState = process.env.LAUNCH_STATE === "live" ? "live" : "prelaunch";
  return (
    <main className="broadcast-page">
      <div className="broadcast-bulbs" aria-hidden="true" />
      <header className="broadcast-nav broadcast-hall-nav">
        <ShowBrand />
        <span>THE HALL · LIVE ON SOLANA</span>
      </header>
      <BingoLiveHall launchState={launchState} variant="game" />
      <footer className="broadcast-footer broadcast-hall-footer">THE HALL</footer>
    </main>
  );
}
