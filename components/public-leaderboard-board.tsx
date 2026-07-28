"use client";

import { usePublicLeaderboard } from "@/components/use-public-leaderboard";

const shortWallet = (value?: string) => value ? `${value.slice(0, 4)}...${value.slice(-4)}` : "NOT CONNECTED";

export function PublicLeaderboardBoard({ limit = 25 }: { limit?: number }) {
  const { entries } = usePublicLeaderboard(limit);

  return (
    <section className="broadcast-leaderboard leaderboard-page-board" id="leaderboard">
      <header>
        <span>THE ROYAL TABLE</span>
        <h2>BOOKS TO BEAT.</h2>
        <p>Wallet · active cards · SOL won · full houses · jackpot hits</p>
      </header>
      {entries.length ? (
        <div className="broadcast-table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Wallet</th>
                <th>Score</th>
                <th>Tier</th>
                <th>SOL Paid</th>
                <th>W / JP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.wallet}>
                  <td>{String(entry.rank).padStart(2, "0")}</td>
                  <td>{shortWallet(entry.wallet)}</td>
                  <td>{entry.score}</td>
                  <td>{entry.tier}</td>
                  <td>{entry.totalSolAirdropped}</td>
                  <td>{entry.wins} / {entry.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="broadcast-no-ranking">THE FIRST CROWN CLAIMS THE TOP LINE.</p>
      )}
    </section>
  );
}
