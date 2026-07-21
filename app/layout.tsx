import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://jaycarson373-tech.github.io/the-hodlers-dilemna");
const title = "Hodlers Dilemma.fun — Hold Together. Or Don’t.";
const description =
  "An on-chain social experiment about conviction, cooperation, betrayal, and the prisoner’s dilemma.";
const socialImage = `${siteUrl}/official-wordmark.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: {
    icon: `${siteUrl}/official-mark.jpg`,
    shortcut: `${siteUrl}/official-mark.jpg`,
    apple: `${siteUrl}/official-mark.jpg`,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Hodlers Dilemma.fun",
    title,
    description,
    images: [{ url: socialImage, width: 1280, height: 427, alt: title }],
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
