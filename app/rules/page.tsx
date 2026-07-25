import type { Metadata } from "next";
import { RulesExperience } from "@/components/rules-experience";

export const metadata: Metadata = {
  title: "The Rules | On-Chain Bingo",
  description: "Learn On-Chain Bingo in 60 seconds: 1M tokens per ticket, creator-fee pools, live cards, and jackpot spins.",
  alternates: { canonical: "/rules" },
};

export default function RulesPage() {
  return <RulesExperience />;
}
