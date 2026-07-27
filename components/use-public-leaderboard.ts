"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import type { LeaderboardEntry } from "@/lib/experiment-data";
import { protocolRequest } from "@/lib/protocol-api";

type LeaderboardRow = {
  rank: number | string;
  wallet: string;
  score: number | string;
  tier: string;
  total_airdropped_lamports: number | string;
  wins: number;
  losses: number;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

const formatScore = (value: number | string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed).toLocaleString("en-US") : String(value);
};

const formatSol = (value: number | string) => {
  const lamports = Number(value);
  if (!Number.isFinite(lamports)) return "0";
  return (lamports / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 3 });
};

const toLeaderboardEntry = (row: LeaderboardRow): LeaderboardEntry => ({
  rank: Number(row.rank),
  wallet: row.wallet,
  score: formatScore(row.score),
  tier: row.tier,
  totalSolAirdropped: formatSol(row.total_airdropped_lamports),
  wins: Number(row.wins),
  losses: Number(row.losses),
});

export function usePublicLeaderboard(limit = 25) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const client = useMemo(() => {
    if (!supabaseUrl || !supabasePublishableKey) return null;
    return createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }, []);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const data = await protocolRequest<LeaderboardRow[]>("/api/leaderboard");
        if (active) setEntries(data.slice(0, limit).map(toLeaderboardEntry));
      } catch (error) {
        if (active) console.error("Public leaderboard load failed", error);
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 20_000);
    if (!client) {
      return () => {
        active = false;
        window.clearInterval(interval);
      };
    }

    const channel = client
      .channel("public-leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holders" },
        () => void refresh(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") console.error("Public leaderboard realtime channel failed");
      });

    return () => {
      active = false;
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [client, limit]);

  return { entries };
}
