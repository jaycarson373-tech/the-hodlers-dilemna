"use client";

import { COMMUNITY_URL, DEXSCREENER_URL, PUMP_FUN_URL, X_URL } from "@/lib/constants";

const xUrl = process.env.NEXT_PUBLIC_X_URL?.trim() || X_URL;
const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() || COMMUNITY_URL;

export function LaunchNavLinks() {
  return (
    <>
      {xUrl ? <a className="launch-x" href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
      <span className="launch-ca" title="Contract address coming soon">CA: SOON</span>
    </>
  );
}

export function LaunchFooterLinks() {
  return (
    <nav className="launch-footer-links" aria-label="Official links">
      {xUrl ? <a href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
      {communityUrl ? <a href={communityUrl} target="_blank" rel="noreferrer">Community</a> : null}
      <a href={PUMP_FUN_URL} target="_blank" rel="noreferrer">Pump.fun</a>
      <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">Dexscreener</a>
    </nav>
  );
}
