"use client";

import { useEffect, useRef, useState } from "react";
import { CA, COMMUNITY_URL, DEXSCREENER_URL, PUMP_FUN_URL, X_URL } from "@/lib/constants";

const publicContractAddress =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim() ||
  process.env.NEXT_PUBLIC_TOKEN_MINT?.trim() ||
  CA;

const xUrl = process.env.NEXT_PUBLIC_X_URL?.trim() || X_URL;
const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() || COMMUNITY_URL;
const contractAddress = publicContractAddress;

const pumpUrl = contractAddress ? PUMP_FUN_URL : null;
const dexUrl = contractAddress ? DEXSCREENER_URL : null;

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
