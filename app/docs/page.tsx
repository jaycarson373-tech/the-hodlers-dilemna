import type { Metadata } from "next";
import { DocsExperience } from "@/components/docs-experience";

export const metadata: Metadata = {
  title: "Documentation | On-Chain Bingo",
  description: "The complete On-Chain Bingo rules, tickets, creator-fee pools, jackpot rounds, and payout documentation.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return <DocsExperience />;
}
