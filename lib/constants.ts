export const TICKER = "$BINGO";
export const CA = process.env.NEXT_PUBLIC_TOKEN_MINT?.trim() || "";
export const SITE_URL = "https://www.bingopump.fun";
export const PUMP_FUN_URL = CA ? `https://pump.fun/coin/${CA}` : "";
export const DEXSCREENER_URL = CA ? `https://dexscreener.com/solana/${CA}` : "";
export const COMMUNITY_URL = "https://x.com/i/communities/2028470502415835347";
export const X_URL = "https://x.com/bingopumpfun";
