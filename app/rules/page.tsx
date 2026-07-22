import type { Metadata } from "next";
import { RulesExperience } from "@/components/rules-experience";

export const metadata: Metadata = {
  title: "The Rules | Holders Dilemma",
  description: "Learn Holders Dilemma in 60 seconds: HOLD, SELL, the signal fade, the reveal, and the rolling pot.",
  alternates: { canonical: "/rules" },
};

export default function RulesPage() {
  return <RulesExperience />;
}
