import type { Metadata } from "next";
import Link from "next/link";
import { ProtocolConsole } from "@/components/protocol-console";
import { WalletConnect } from "@/components/wallet-connect";

export const metadata: Metadata = {
  title: "Enter Game | Hodl or No Hodl.fun",
  description: "Enter the Hodl or No Hodl game room. Connect, verify 500K tokens, then choose HODL or NO HODL.",
};

const entrySteps = [
  ["01", "Connect Wallet", "Use a Solana wallet. No private key leaves your wallet."],
  ["02", "Answer the Call", "Sign one message so the Banker knows your seat."],
  ["03", "Claim Seat", "A 500K-token hold gets you to the table."],
  ["04", "Choose", "Pick HODL or NO HODL before the Banker closes the case."],
];

function GameMark() {
  return (
    <span className="game-mark" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/official-mark.jpg" alt="" width="1254" height="1254" />
    </span>
  );
}

export default function PlayPage() {
  return (
    <main className="game-page">
      <div className="game-page-bg" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <header className="game-topbar">
        <Link className="game-brand" href="/">
          <GameMark />
          <span>HODL OR NO HODL<span>.FUN</span></span>
        </Link>
        <nav aria-label="Game room navigation">
          <Link href="/">Rules</Link>
          <a href="#game-console">Play</a>
          <WalletConnect />
        </nav>
      </header>

      <section className="game-room-hero section-shell">
        <div className="game-room-copy">
          <p>LIVE GAME ROOM / 30-MINUTE ROUNDS</p>
          <h1>THE BANKER IS CALLING.</h1>
          <span>Connect your wallet, claim your 500K-token seat, then wait for the Banker&apos;s offer.</span>
          <div className="game-room-actions">
            <a className="button button-primary" href="#game-console">Enter Game <b>↓</b></a>
            <Link className="button button-secondary" href="/">Back to Rules</Link>
          </div>
        </div>

        <div className="game-case-stage" aria-hidden="true">
          <div className="game-case-lights" />
          <div className="game-case">
            <span>?</span>
          </div>
          <div className="game-case-caption">
            <span>IN THE BOX</span>
            <strong>FEE POT</strong>
          </div>
        </div>
      </section>

      <section className="game-entry-strip section-shell" aria-label="How to enter">
        {entrySteps.map(([number, title, copy]) => (
          <article key={number}>
            <span>{number}</span>
            <strong>{title}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="game-console-stage" id="game-console" aria-label="Playable Hodl or No Hodl console">
        <div className="game-console-stage-heading section-shell">
          <span>OPEN THE BOX</span>
          <h2>CHOOSE HODL OR NO HODL.</h2>
          <p>The live controls appear here when the Banker opens the round.</p>
        </div>
        <ProtocolConsole />
      </section>
    </main>
  );
}
