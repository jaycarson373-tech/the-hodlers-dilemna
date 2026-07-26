-- On-Chain Bingo launch reset.
-- Run this AFTER supabase/schema.sql to clear game data without changing schema.
-- The Railway worker recreates bingo_config from its TOKEN_MINT and timing env.

truncate table
  public.bingo_payouts,
  public.bingo_entries,
  public.bingo_game_secrets,
  public.bingo_games,
  public.audit_log,
  public.feed_events,
  public.protocol_events,
  public.wallet_auth_nonces,
  public.wallet_sessions
restart identity cascade;

delete from public.bingo_config;

update public.holders
set
  position_amount = 0,
  token_balance_raw = 0,
  card_count = 0,
  leaderboard_score = 0,
  bingo_wins = 0,
  jackpot_wins = 0,
  total_airdropped_lamports = 0,
  updated_at = now();

insert into public.feed_events (event_type, round_number, title, detail, tone)
values (
  'BINGO_ROOM_READY',
  null,
  'BINGO ROOM READY',
  'The board is clean. The first funded draw will open automatically.',
  'gold'
);

notify pgrst, 'reload schema';
