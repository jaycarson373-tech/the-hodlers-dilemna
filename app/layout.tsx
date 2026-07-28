import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";
import "./broadcast.css";
import "./royal.css";

const siteUrl = SITE_URL;
const title = "Bingo Royale — The Blue Hall";
const description =
  "Enter the Blue Hall. Every 2,000,000 tokens deals a live card; the first full house wins the funded SOL prize.";
const brandIcon = "/royal-bingo-mark.png";
const socialImage = `${siteUrl}/royal-bingo-banner.png`;
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
      { url: brandIcon, type: "image/png" },
    ],
    shortcut: brandIcon,
    apple: brandIcon,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Bingo Royale",
    title,
    description,
    images: [{ url: socialImage, width: 2172, height: 724, alt: title }],
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
