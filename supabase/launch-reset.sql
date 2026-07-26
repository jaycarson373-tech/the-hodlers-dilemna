-- On-Chain Bingo launch reset.
-- Run this AFTER supabase/schema.sql when you want a clean board for Round 1.
-- This clears game state, chat/feed/history/votes/audit rows, and leaves the schema intact.

truncate table
  public.audit_log,
  public.audience_signals,
  public.commitments,
  public.feed_events,
  public.protocol_events,
  public.revealed_choices,
  public.reward_claims,
  public.round_snapshots,
  public.round_votes,
  public.sealed_choices,
  public.wallet_auth_nonces,
  public.wallet_sessions,
  public.rounds
restart identity cascade;

update public.holders
set
  cooperate_votes = 0,
  defect_votes = 0,
  leaderboard_score = 0,
  wins = 0,
  losses = 0,
  total_airdropped_lamports = 0,
  updated_at = now();

insert into public.protocol_config (
  id,
  program_id,
  token_mint,
  cluster,
  current_round,
  available_pool_lamports,
  pot_rollover_count,
  round_length_seconds,
  decision_window_seconds,
  cooperation_threshold_bps,
  failed_round_count,
  round_active,
  paused,
  next_round_at,
  updated_at
)
values (
  true,
  'supabase-mainnet-bingo',
  'REPLACE_WITH_TOKEN_MINT',
  'mainnet-beta',
  0,
  0,
  0,
  900,
  900,
  5000,
  0,
  false,
  false,
  now(),
  now()
)
on conflict (id) do update
set
  program_id = excluded.program_id,
  token_mint = excluded.token_mint,
  cluster = excluded.cluster,
  current_round = excluded.current_round,
  available_pool_lamports = excluded.available_pool_lamports,
  pot_rollover_count = excluded.pot_rollover_count,
  round_length_seconds = excluded.round_length_seconds,
  decision_window_seconds = excluded.decision_window_seconds,
  cooperation_threshold_bps = excluded.cooperation_threshold_bps,
  failed_round_count = excluded.failed_round_count,
  round_active = excluded.round_active,
  paused = excluded.paused,
  next_round_at = excluded.next_round_at,
  updated_at = now();

insert into public.worker_state (id, last_processed_round, updated_at)
values (true, 0, now())
on conflict (id) do update
set last_processed_round = 0,
    updated_at = now();

insert into public.feed_events (event_type, round_number, title, detail, tone)
values (
  'BINGO_ROOM_READY',
  null,
  'BINGO ROOM READY',
  'The board is clean. The next funded draw starts Round 1.',
  'gold'
);
