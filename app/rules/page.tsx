import type { Metadata } from "next";
import { RulesExperience } from "@/components/rules-experience";

export const metadata: Metadata = {
  title: "The Rules | Hodl or No Hodl.fun",
  description: "Learn Hodl or No Hodl in 60 seconds: The Box, the Banker's offer, the reveal, and the jackpot.",
  alternates: { canonical: "/rules" },
};

export default function RulesPage() {
  return <RulesExperience />;
}
