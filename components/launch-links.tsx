const xUrl = process.env.NEXT_PUBLIC_X_URL?.trim() || "https://x.com/HodlorNoHodl";
const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() || "https://x.com/i/communities/1998087011219980638";
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();

const pumpUrl = contractAddress ? `https://pump.fun/coin/${contractAddress}` : null;
const dexUrl = contractAddress ? `https://dexscreener.com/solana/${contractAddress}` : null;

export function LaunchNavLinks() {
  return (
    <>
      <a className="launch-x" href={xUrl} target="_blank" rel="noreferrer">X</a>
      <span className="launch-ca" title={contractAddress ?? "Contract address coming soon"}>
        CA: {contractAddress ? `${contractAddress.slice(0, 4)}…${contractAddress.slice(-4)}` : "SOON"}
      </span>
    </>
  );
}

export function LaunchFooterLinks() {
  return (
    <nav className="launch-footer-links" aria-label="Official links">
      <a href={xUrl} target="_blank" rel="noreferrer">X</a>
      <a href={communityUrl} target="_blank" rel="noreferrer">Community</a>
      {pumpUrl ? <a href={pumpUrl} target="_blank" rel="noreferrer">Pump.fun</a> : <span>Pump.fun · CA soon</span>}
      {dexUrl ? <a href={dexUrl} target="_blank" rel="noreferrer">Dexscreener</a> : <span>Dexscreener · CA soon</span>}
    </nav>
  );
}
