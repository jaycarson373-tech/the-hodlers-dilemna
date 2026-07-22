"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import type { LeaderboardEntry } from "@/lib/experiment-data";

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
    if (!client) return;
    let active = true;

    const refresh = async () => {
      const { data, error } = await client
        .from("public_leaderboard")
        .select("rank,wallet,score,tier,total_airdropped_lamports,wins,losses")
        .order("rank", { ascending: true })
        .limit(limit);

      if (!active) return;
      if (error) {
        console.error("Public leaderboard load failed", error);
        return;
      }

      setEntries((data as LeaderboardRow[]).map(toLeaderboardEntry));
    };

    void refresh();
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
      void client.removeChannel(channel);
    };
  }, [client, limit]);

  return { entries };
}
