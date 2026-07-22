"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import type { FeedEntry } from "@/lib/experiment-data";

type FeedEventRow = {
  id: string;
  event_type: string;
  title: string | null;
  detail: string;
  tone: string | null;
  occurred_at: string;
};

export type BankerFeedItem = FeedEntry & { id: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

const titleFromType = (value: string) => value.replaceAll("_", " ");

const toneFromRow = (row: FeedEventRow): FeedEntry["tone"] => {
  if (row.tone === "cooperate" || row.tone === "defect" || row.tone === "gold" || row.tone === "neutral") {
    return row.tone;
  }
  if (/ROLL|DEFECT|SELL|NO_HODL|CLOSED/i.test(row.event_type)) return "defect";
  if (/OPEN|HODL|PAID|SETTLED/i.test(row.event_type)) return "cooperate";
  if (/FEE|POT|SWEEP|BONUS/i.test(row.event_type)) return "gold";
  return "neutral";
};

const formatEventTime = (value: string) => new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).format(new Date(value));

const toFeedItem = (row: FeedEventRow): BankerFeedItem => ({
  id: row.id,
  time: formatEventTime(row.occurred_at),
  event: row.title || titleFromType(row.event_type),
  detail: row.detail,
  tone: toneFromRow(row),
});

export function useBankerFeed(limit = 8) {
  const [events, setEvents] = useState<BankerFeedItem[]>([]);

  const client = useMemo(() => {
    if (!supabaseUrl || !supabasePublishableKey) return null;
    return createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;

    void client
      .from("feed_events")
      .select("id,event_type,title,detail,tone,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Banker Feed initial load failed", error);
          return;
        }
        if (data?.length) {
          setEvents((data as FeedEventRow[]).map(toFeedItem));
        }
      });

    const channel = client
      .channel("banker-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feed_events" },
        (payload) => {
          if (!active) return;
          const next = toFeedItem(payload.new as FeedEventRow);
          setEvents((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, limit));
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") console.error("Banker Feed realtime channel failed");
      });

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [client, limit]);

  return { events };
}
