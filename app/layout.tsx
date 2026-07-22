import type { Metadata } from "next";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import "./globals.css";
import "./broadcast.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://holdersdilemma.fun";
const title = "Holders Dilemma";
const description =
  "A pump.fun holder dilemma where every 15-minute round asks the same question: HOLD, or JEET?";
const brandIcon = "/holders-dilemma-logo.png";
const socialImage = `${siteUrl}/holders-dilemma-og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: brandIcon, type: "image/png" },
    ],
    shortcut: brandIcon,
    apple: brandIcon,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Holders Dilemma",
    title,
    description,
    images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
