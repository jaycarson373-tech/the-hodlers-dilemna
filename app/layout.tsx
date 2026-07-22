import type { Metadata } from "next";
import { SolanaWalletProvider } from "@/components/solana-wallet-provider";
import "./globals.css";
import "./broadcast.css";

const siteUrl = "https://hodlornohodl.fun";
const title = "Hodl or No Hodl.fun";
const description =
  "A live holder game where every round ends with one question: HODL, or NO HODL?";
const brandIcon = `${siteUrl}/hodl-no-hodl-icon-v2.jpg`;
const socialImage = `${siteUrl}/hodl-no-hodl-og-v2.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: brandIcon,
    shortcut: brandIcon,
    apple: brandIcon,
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
