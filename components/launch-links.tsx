"use client";

import { CA, COMMUNITY_URL, DEXSCREENER_URL, PUMP_FUN_URL, X_URL } from "@/lib/constants";

const xUrl = process.env.NEXT_PUBLIC_X_URL?.trim() || X_URL;
const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() || COMMUNITY_URL;

export function LaunchNavLinks({ forceCaSoon = false }: { forceCaSoon?: boolean }) {
  const showCa = !forceCaSoon && Boolean(CA);
  return (
    <>
      {xUrl ? <a className="launch-x" href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
      <span className="launch-ca" title={showCa ? CA : "Contract address coming soon"}>
        {showCa ? `CA: ${CA.slice(0, 5)}...${CA.slice(-4)}` : "CA: SOON"}
      </span>
    </>
  );
}

export function LaunchFooterLinks() {
  return (
    <nav className="launch-footer-links" aria-label="Official links">
      {xUrl ? <a href={xUrl} target="_blank" rel="noreferrer">X</a> : null}
      {communityUrl ? <a href={communityUrl} target="_blank" rel="noreferrer">Community</a> : null}
      {PUMP_FUN_URL ? <a href={PUMP_FUN_URL} target="_blank" rel="noreferrer">Pump.fun</a> : null}
      {DEXSCREENER_URL ? <a href={DEXSCREENER_URL} target="_blank" rel="noreferrer">Dexscreener</a> : null}
    </nav>
  );
}
