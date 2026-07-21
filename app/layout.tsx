import type { Metadata } from "next";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hodlornohodl.fun";
const title = "Hodl or No Hodl.fun";
const description =
  "A live holder game where every round ends with one question: HODL, or NO HODL?";
const socialImage = `${siteUrl}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: `${siteUrl}/official-mark.jpg`,
    shortcut: `${siteUrl}/official-mark.jpg`,
    apple: `${siteUrl}/official-mark.jpg`,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Hodl or No Hodl.fun",
    title,
    description,
    images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    site: "@hodlornohodl",
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
