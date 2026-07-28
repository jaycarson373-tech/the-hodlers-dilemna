-- On-Chain Bingo launch reset.
-- Run once immediately before launch. This adds the one-minute game lobby,
-- clears test data, and lets Railway recreate config from its launch env.

alter table public.bingo_config
  add column if not exists intermission_seconds integer not null default 60;

alter table public.bingo_config
  drop constraint if exists bingo_config_intermission_seconds_check;

alter table public.bingo_config
  add constraint bingo_config_intermission_seconds_check
  check (intermission_seconds between 0 and 3600);

create or replace function public.schedule_bingo_intermission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.game_active and not new.game_active then
    new.next_game_at := now() + make_interval(secs => greatest(new.intermission_seconds, 0));
  end if;
  return new;
end;
$$;

drop trigger if exists schedule_bingo_intermission on public.bingo_config;
create trigger schedule_bingo_intermission
before update on public.bingo_config
for each row execute function public.schedule_bingo_intermission();

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
