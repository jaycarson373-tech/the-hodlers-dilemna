import type { Metadata } from "next";
import { DocsExperience } from "@/components/docs-experience";

export const metadata: Metadata = {
  title: "Documentation | Hodl or No Hodl.fun",
  description: "The complete Hodl or No Hodl episode, eligibility, signal, settlement, rollover, and payout documentation.",
  alternates: { canonical: "/docs" },
};

export default function DocsPage() {
  return <DocsExperience />;
}
