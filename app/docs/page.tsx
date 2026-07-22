import type { Metadata } from "next";
import { DocsExperience } from "@/components/docs-experience";

export const metadata: Metadata = {
  title: "Documentation | Holders Dilemma",
  description: "The complete Holders Dilemma rules, eligibility, signal fade, settlement, rollover, and payout documentation.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return <DocsExperience />;
}
