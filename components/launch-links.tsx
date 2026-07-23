"use client";

import { useEffect, useRef, useState } from "react";

const publicContractAddress =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_TOKEN_MINT?.trim() ||
  "EVJSSzoD73noecpLV6f2Y3589AxV6XK3vFEV1vGNpump";

const xUrl = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HoldersDilemma";
const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim();
const contractAddress = publicContractAddress;

const pumpUrl = contractAddress ? `https://pump.fun/coin/${contractAddress}` : null;
const dexUrl = contractAddress ? `https://dexscreener.com/solana/${contractAddress}` : null;

export function LaunchNavLinks() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  const copyContract = async () => {
    if (!contractAddress) return;
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {xUrl ? <a className="launch-x" href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
      {contractAddress ? (
        <button className="launch-ca" type="button" title="Copy contract address" aria-label="Copy contract address" onClick={() => void copyContract()}>
          {copied ? "COPIED" : `CA: ${contractAddress.slice(0, 4)}…${contractAddress.slice(-4)}`}
        </button>
      ) : (
        <span className="launch-ca" title="Contract address coming soon">CA: SOON</span>
      )}
    </>
  );
}

export function LaunchFooterLinks() {
  return (
    <nav className="launch-footer-links" aria-label="Official links">
      {xUrl ? <a href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
      {communityUrl ? <a href={communityUrl} target="_blank" rel="noreferrer">Community</a> : null}
      {pumpUrl && dexUrl ? <><a href={pumpUrl} target="_blank" rel="noreferrer">Pump.fun</a><a href={dexUrl} target="_blank" rel="noreferrer">Dexscreener</a></> : <span>CA soon</span>}
    </nav>
  );
}
