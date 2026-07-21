"use client";

import { useWalletConnection } from "@solana/react-hooks";
import { useEffect, useRef, useState } from "react";

const truncateAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

export function WalletConnect() {
  const {
    connect,
    connected,
    connecting,
    connectors,
    currentConnector,
    disconnect,
    error,
    isReady,
    wallet,
  } = useWalletConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [localError, setLocalError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const address = wallet?.account.address.toString();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const connectWallet = async (connectorId: string) => {
    setLocalError("");
    try {
      await connect(connectorId);
      setIsOpen(false);
    } catch (connectionError) {
      setLocalError(
        connectionError instanceof Error
          ? connectionError.message
          : "The wallet connection was not completed.",
      );
    }
  };

  const disconnectWallet = async () => {
    setLocalError("");
    try {
      await disconnect();
      setIsOpen(false);
    } catch (disconnectError) {
      setLocalError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "The wallet could not be disconnected.",
      );
    }
  };

  const buttonLabel = connecting
    ? "Connecting..."
    : address
      ? truncateAddress(address)
      : "Connect Wallet";

  return (
    <>
      <button
        type="button"
        className={`wallet-button ${connected ? "connected" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={!isReady || connecting}
        onClick={() => setIsOpen(true)}
      >
        {connected ? <i aria-hidden="true" /> : null}
        {buttonLabel}
      </button>

      {isOpen ? (
        <div
          className="wallet-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            className="wallet-modal terminal-frame"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
          >
            <div className="wallet-modal-header">
              <div>
                <span>WALLET ACCESS / MAINNET</span>
                <h2 id="wallet-modal-title">
                  {connected ? "WALLET CONNECTED" : "SELECT A WALLET"}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="wallet-modal-close"
                aria-label="Close wallet dialog"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            {connected && address ? (
              <div className="connected-wallet-panel">
                <span className="connected-wallet-status"><i /> ACTIVE CONNECTION</span>
                <strong>{truncateAddress(address)}</strong>
                <code>{address}</code>
                <dl>
                  <div><dt>Connector</dt><dd>{currentConnector?.name ?? "Wallet Standard"}</dd></div>
                  <div><dt>Network</dt><dd>Solana Mainnet</dd></div>
                  <div><dt>Permission</dt><dd>Public address only</dd></div>
                </dl>
                <button type="button" className="disconnect-button" onClick={disconnectWallet}>
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="wallet-options">
                {connectors.length ? (
                  connectors.map((connector, index) => (
                    <button
                      type="button"
                      className="wallet-option"
                      disabled={connecting}
                      key={connector.id}
                      onClick={() => connectWallet(connector.id)}
                    >
                      <span className="wallet-monogram" aria-hidden="true">
                        {connector.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span><strong>{connector.name}</strong><small>Wallet Standard detected</small></span>
                      <span className="wallet-option-index">0{index + 1}</span>
                    </button>
                  ))
                ) : (
                  <div className="wallet-empty-state">
                    <span>NO COMPATIBLE WALLET DETECTED</span>
                    <p>Install or enable a Solana Wallet Standard browser wallet, then refresh this page.</p>
                  </div>
                )}
              </div>
            )}

            <p className="wallet-permission-note">
              Connecting exposes your public address. Playing requires a message signature, and each deposit, vote, withdrawal, or claim requires separate wallet approval.
            </p>
            {localError || error ? (
              <p className="wallet-error" role="alert">
                {localError || (error instanceof Error ? error.message : "Wallet connection failed.")}
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
