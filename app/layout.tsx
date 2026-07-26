import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";
import "./broadcast.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || SITE_URL;
const title = "Bingo.fun — On-Chain Bingo";
const description =
  "Fast Solana bingo powered by creator fees. Every 1M tokens becomes a live ticket on the board.";
const brandIcon = "/bingo-logo.jpg";
const socialImage = `${siteUrl}/og.png`;
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: brandIcon, type: "image/svg+xml" },
    ],
    shortcut: brandIcon,
    apple: brandIcon,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Bingo.fun",
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
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
