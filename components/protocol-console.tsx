"use client";

import { getTransactionDecoder } from "@solana/transactions";
import { useWalletConnection } from "@solana/react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  baseUnitsToTokenAmount,
  lamportsToSol,
  protocolApiUrl,
  protocolRequest,
  tokenAmountToBaseUnits,
  type HolderState,
  type ProtocolStatus,
} from "@/lib/protocol-api";

const tierNames = ["Paper Hands", "Iron Hands", "Diamond Hands", "Obsidian Hands"];
const bytesFromBase64 = (value: string) => Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));
const base64FromBytes = (value: Uint8Array) => {
  let binary = "";
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
};
const remainingSeconds = (iso?: string | null) => iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 0;
const formatCountdown = (seconds: number) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
};

type TransactionResponse = { transaction: string };

export function ProtocolConsole() {
  const { connected, wallet } = useWalletConnection();
  const address = wallet?.account.address.toString();
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [holder, setHolder] = useState<HolderState | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [amount, setAmount] = useState("1000");
  const [fundSol, setFundSol] = useState("0.1");
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!protocolApiUrl) return;
    const nextStatus = await protocolRequest<ProtocolStatus>("/api/status");
    setStatus(nextStatus);
    const target = nextStatus.roundActive ? nextStatus.round?.closesAt : nextStatus.nextRoundAt;
    setCountdown(remainingSeconds(target));
    if (address) setHolder(await protocolRequest<HolderState>(`/api/holder/${address}`));
  }, [address]);

  useEffect(() => {
    if (!protocolApiUrl) return;
    const initial = window.setTimeout(() => {
      void refresh().catch((refreshError) => setError(refreshError instanceof Error ? refreshError.message : "Unable to load the protocol."));
    }, 0);
    const interval = window.setInterval(() => void refresh().catch(() => undefined), 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSessionToken("");
      setHolder(null);
      setMessage("");
      setError("");
    });
  }, [address]);

  const signIn = useCallback(async () => {
    if (!wallet || !address) throw new Error("Connect a Solana wallet first.");
    if (!wallet.signMessage) throw new Error("This wallet does not support message signing.");
    setBusy("signin");
    setError("");
    try {
      const challenge = await protocolRequest<{ message: string }>(`/api/auth/challenge?wallet=${encodeURIComponent(address)}`);
      const signature = await wallet.signMessage(new TextEncoder().encode(challenge.message));
      const verified = await protocolRequest<{ token: string }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ wallet: address, message: challenge.message, signature: base64FromBytes(signature) }),
      });
      setSessionToken(verified.token);
      setMessage("Wallet ownership verified. You can now submit game transactions.");
      return verified.token;
    } finally {
      setBusy("");
    }
  }, [address, wallet]);

  const sendGameTransaction = useCallback(async (path: string, body: Record<string, string>, label: string) => {
    if (!wallet || !address) throw new Error("Connect a Solana wallet first.");
    if (!wallet.sendTransaction) throw new Error("This wallet cannot send Solana transactions.");
    setBusy(label);
    setError("");
    setMessage("");
    try {
      const token = sessionToken || await signIn();
      const prepared = await protocolRequest<TransactionResponse>(path, {
        method: "POST",
        body: JSON.stringify({ wallet: address, ...body }),
      }, token);
      const transaction = getTransactionDecoder().decode(bytesFromBase64(prepared.transaction));
      const signature = await wallet.sendTransaction(transaction as Parameters<NonNullable<typeof wallet.sendTransaction>>[0], { commitment: "confirmed" });
      setMessage(`${label} submitted: ${String(signature)}`);
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      await refresh();
    } catch (transactionError) {
      setError(transactionError instanceof Error ? transactionError.message : `${label} failed.`);
    } finally {
      setBusy("");
    }
  }, [address, refresh, sessionToken, signIn, wallet]);

  const decimals = status?.tokenDecimals ?? 6;
  const positionAmount = holder?.position ? baseUnitsToTokenAmount(holder.position.amount, decimals) : "0";
  const round = status?.round;
  const hasPosition = Boolean(holder?.position && BigInt(holder.position.amount) > 0n);
  const canVote = Boolean(connected && sessionToken && hasPosition && status?.roundActive && round?.status === "open");
  const canClaim = Boolean(connected && sessionToken && round?.status === "settled");
  const protocolReady = Boolean(protocolApiUrl && status?.configured);
  const headline = useMemo(() => {
    if (!protocolApiUrl) return "DEPLOYMENT CONFIGURATION REQUIRED";
    if (!status) return "CONTACTING THE PROTOCOL";
    if (!status.configured) return "ON-CHAIN PROGRAM NOT INITIALIZED";
    return status.roundActive ? `ROUND ${status.currentRound} / DECISION WINDOW OPEN` : "ROUND SETTLEMENT / NEXT WINDOW PENDING";
  }, [status]);

  const amountInBaseUnits = () => tokenAmountToBaseUnits(amount, decimals);

  return (
    <section className="protocol-console section-shell" id="play" aria-labelledby="protocol-console-title">
      <div className="protocol-console-head">
        <div><span>LIVE GAME / SOLANA</span><h2 id="protocol-console-title">{headline}</h2></div>
        <div className="protocol-countdown"><span>{status?.roundActive ? "ROUND CLOSES IN" : "NEXT ROUND IN"}</span><strong>{formatCountdown(countdown)}</strong></div>
      </div>

      <div className="protocol-stats">
        <div><span>ROUND</span><strong>{status?.currentRound ?? "—"}</strong></div>
        <div><span>POT</span><strong>{lamportsToSol(round?.potLamports ?? status?.availablePoolLamports)} SOL</strong></div>
        <div><span>COOPERATE</span><strong>{round ? `${round.cooperatePercent.toFixed(1)}%` : "—"}</strong></div>
        <div><span>DEFECT</span><strong>{round ? `${round.defectPercent.toFixed(1)}%` : "—"}</strong></div>
        <div><span>VOTERS</span><strong>{round?.voterCount ?? 0}</strong></div>
        <div><span>WALLET / POSITION</span><strong>{holder ? `${baseUnitsToTokenAmount(holder.walletTokenBalance, decimals)} / ${positionAmount}` : "—"}</strong></div>
      </div>

      {!protocolReady ? <div className="protocol-console-message"><strong>{protocolApiUrl ? "PROGRAM DEPLOYMENT PENDING" : "API URL MISSING"}</strong><p>{protocolApiUrl ? "The API is reachable, but the Solana program has not been initialized for the token yet." : "Set NEXT_PUBLIC_API_URL in Vercel to the Railway public URL to activate this panel."}</p></div> : null}

      <div className="protocol-wallet-row">
        <div><span>WALLET ACCESS</span><strong>{address ? `${address.slice(0, 5)}…${address.slice(-5)}` : "NOT CONNECTED"}</strong><small>{sessionToken ? "SIGNED IN / TRANSACTIONS ENABLED" : connected ? "SIGN IN TO PLAY" : "CONNECT ABOVE TO CONTINUE"}</small></div>
        {connected && !sessionToken ? <button type="button" disabled={Boolean(busy)} onClick={() => void signIn().catch((signInError) => setError(signInError instanceof Error ? signInError.message : "Sign-in failed."))}>{busy === "signin" ? "SIGNING…" : "SIGN IN"}</button> : null}
      </div>

      {protocolApiUrl && status && !status.configured && connected && sessionToken ? (
        <div className="protocol-actions">
          <button type="button" disabled={Boolean(busy)} onClick={() => void sendGameTransaction("/api/tx/initialize", {}, "PROTOCOL INITIALIZATION")}>INITIALIZE HOURLY GAME</button>
        </div>
      ) : null}

      {protocolReady && connected && sessionToken ? (
        <div className="protocol-actions">
          <label><span>FUND POT / SOL</span><input inputMode="decimal" value={fundSol} onChange={(event) => setFundSol(event.target.value)} aria-label="SOL to add to the fee pot" /></label>
          <button type="button" disabled={Boolean(busy) || !/^\d+(\.\d+)?$/.test(fundSol)} onClick={() => void sendGameTransaction("/api/tx/fund", { amount: Math.floor(Number(fundSol) * 1_000_000_000).toString() }, "FEE POT FUNDING")}>ADD SOL TO NEXT POT</button>
          {!holder?.position ? <button type="button" disabled={Boolean(busy)} onClick={() => void sendGameTransaction("/api/tx/open-position", {}, "POSITION OPEN")}>OPEN TOKEN POSITION</button> : (
            <>
              <label><span>TOKEN AMOUNT</span><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Token amount" /></label>
              <button type="button" disabled={Boolean(busy)} onClick={() => { try { void sendGameTransaction("/api/tx/deposit", { amount: amountInBaseUnits() }, "DEPOSIT"); } catch (amountError) { setError(amountError instanceof Error ? amountError.message : "Invalid amount."); } }}>DEPOSIT / BUILD STREAK</button>
              <button type="button" disabled={Boolean(busy) || !hasPosition} onClick={() => { try { void sendGameTransaction("/api/tx/withdraw", { amount: amountInBaseUnits() }, "WITHDRAW"); } catch (amountError) { setError(amountError instanceof Error ? amountError.message : "Invalid amount."); } }}>WITHDRAW / RESET STREAK</button>
              <button className="cooperate-action" type="button" disabled={Boolean(busy) || !canVote} onClick={() => void sendGameTransaction("/api/tx/vote", { choice: "cooperate" }, "COOPERATE VOTE")}>COOPERATE</button>
              <button className="defect-action" type="button" disabled={Boolean(busy) || !canVote} onClick={() => void sendGameTransaction("/api/tx/vote", { choice: "defect" }, "DEFECT VOTE")}>DEFECT</button>
              <button type="button" disabled={Boolean(busy) || !canClaim} onClick={() => void sendGameTransaction("/api/tx/claim", { roundNumber: status?.currentRound ?? "0" }, "REWARD CLAIM")}>CLAIM ROUND REWARD</button>
            </>
          )}
        </div>
      ) : null}

      {holder?.position ? <div className="protocol-position-line"><span>TIER <b>{tierNames[holder.position.tier] ?? holder.position.tierName}</b></span><span>STREAK <b>{Math.floor(Number(holder.position.streakSeconds) / 86_400)} DAYS</b></span><span>ESCROWED <b>{positionAmount}</b></span></div> : null}
      {message ? <p className="protocol-success" role="status">{message}</p> : null}
      {error ? <p className="protocol-error" role="alert">{error}</p> : null}
      <p className="protocol-console-foot">Transactions require wallet approval and network fees. Depositing moves tokens into program escrow; withdrawing any amount resets the streak.</p>
    </section>
  );
}
