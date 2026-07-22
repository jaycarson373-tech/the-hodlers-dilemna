"use client";

import type { SolanaClientConfig } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";

const configuredRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim();
const rpcEndpoint = configuredRpc || "https://rpc-not-configured.invalid";

const solanaConfig: SolanaClientConfig = {
  cluster: "mainnet-beta",
  commitment: "confirmed",
  endpoint: rpcEndpoint as SolanaClientConfig["endpoint"],
};

const walletPersistence = {
  autoConnect: true,
  storageKey: "hodlers-dilemna:wallet",
} as const;

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider
      config={solanaConfig}
      query={false}
      walletPersistence={walletPersistence}
    >
      {children}
    </SolanaProvider>
  );
}
