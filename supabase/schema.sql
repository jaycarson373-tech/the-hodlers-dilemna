-- On-Chain Bingo mainnet game model.
-- Railway is the only writer; the public site reads this state.

create extension if not exists pgcrypto;

create table if not exists public.protocol_config (
  id boolean primary key default true check (id),
  program_id text not null,
  token_mint text not null,
  cluster text not null default 'mainnet-beta',
  current_round bigint not null default 0,
  available_pool_lamports bigint not null default 0,
  pot_rollover_count integer not null default 0,
  round_length_seconds bigint not null default 900,
  decision_window_seconds bigint not null default 900,
  cooperation_threshold_bps integer not null default 5000,
  failed_round_count integer not null default 0,
  claim_window_seconds bigint not null default 604800,
  defect_threshold_bps integer not null default 5000,
  defector_bonus_bps integer not null default 15000,
  next_round_at timestamptz,
  round_active boolean not null default false,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.rounds (
  round_number bigint primary key,
  status text not null check (status in ('open','settled','rolled_over','closed')),
  opened_at timestamptz not null,
  closes_at timestamptz not null,
  claim_deadline timestamptz,
  pot_lamports bigint not null,
  remaining_lamports bigint not null,
  cooperate_weight numeric(40,0) not null default 0,
  defect_weight numeric(40,0) not null default 0,
  distribution_weight numeric(40,0) not null default 0,
  voter_count integer not null default 0,
  deal_budget_lamports bigint not null default 0,
  accepted_deals_lamports bigint not null default 0,
  hodl_pool_lamports bigint not null default 0,
  rollover_lamports bigint not null default 0,
  weighted_hodl_bps integer,
  force_open boolean not null default false,
  settled_at timestamptz,
  transaction_signature text,
  updated_at timestamptz not null default now()
);

create table if not exists public.holders (
  wallet text primary key,
  position_amount numeric(40,0) not null default 0,
  streak_started_at timestamptz,
  last_withdraw_at timestamptz,
  locked_until timestamptz,
  bonus_bps integer not null default 0,
  tier integer not null default 0,
  cooperate_votes integer not null default 0,
  defect_votes integer not null default 0,
  leaderboard_score numeric(40,0) not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  total_airdropped_lamports bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.round_votes (
  round_number bigint not null references public.rounds(round_number) on delete cascade,
  wallet text not null,
  choice text not null check (choice in ('cooperate','defect')),
  weight numeric(40,0) not null,
  multiplier_bps integer not null,
  voted_at timestamptz not null,
  transaction_signature text,
  primary key (round_number, wallet)
);

create table if not exists public.reward_claims (
  round_number bigint not null references public.rounds(round_number) on delete cascade,
  wallet text not null,
  amount_lamports bigint not null,
  claimed_at timestamptz not null,
  transaction_signature text,
  primary key (round_number, wallet)
);

create table if not exists public.protocol_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  round_number bigint,
  wallet text,
  detail text not null,
  transaction_signature text,
  occurred_at timestamptz not null default now()
);

-- Public, presentation-safe event stream for the Bingo Feed. The worker may
-- continue writing protocol_events; the trigger below mirrors only display
-- fields and keeps infrastructure details out of the browser-facing table.
create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  round_number bigint,
  title text,
  detail text not null,
  tone text not null default 'neutral' check (tone in ('cooperate','defect','gold','neutral')),
  occurred_at timestamptz not null default now()
);

create table if not exists public.wallet_auth_nonces (
  wallet text primary key,
  message text not null,
  nonce_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.round_snapshots (
  round_number bigint not null references public.rounds(round_number) on delete cascade,
  wallet text not null,
  snapshot_balance numeric(40,0) not null,
  multiplier_bps integer not null default 10000,
  payout_weight numeric(40,0) not null,
  banker_offer_lamports bigint not null default 0,
  live_balance numeric(40,0),
  forced_no_hodl boolean not null default false,
  final_choice text check (final_choice in ('cooperate','defect')),
  payout_lamports bigint not null default 0,
  created_at timestamptz not null default now(),
  primary key (round_number, wallet)
);

create table if not exists public.sealed_choices (
  id uuid primary key default gen_random_uuid(),
  round_number bigint not null references public.rounds(round_number) on delete cascade,
  wallet text not null,
  choice text not null check (choice in ('cooperate','defect')),
  salt text not null,
  commitment text not null,
  version integer not null,
  submitted_at timestamptz not null default now(),
  superseded_at timestamptz,
  revealed_at timestamptz,
  unique (round_number, wallet, version),
  unique (commitment)
);

create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  round_number bigint not null references public.rounds(round_number) on delete cascade,
  wallet text not null,
  commitment text not null unique,
  version integer not null,
  superseded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.revealed_choices (
  round_number bigint not null references public.rounds(round_number) on delete cascade,
  wallet text not null,
  choice text not null check (choice in ('cooperate','defect')),
  salt text not null,
  commitment text not null unique,
  revealed_at timestamptz not null default now(),
  primary key (round_number, wallet)
);

create table if not exists public.audience_signals (
  round_number bigint not null references public.rounds(round_number) on delete cascade,
  fingerprint_hash text not null,
  choice text not null check (choice in ('cooperate','defect')),
  updated_at timestamptz not null default now(),
  primary key (round_number, fingerprint_hash)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  action text not null,
  round_number bigint,
  wallet text,
  amount_lamports bigint,
  payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('planned','dry_run','broadcast','confirmed','failed')),
  transaction_signature text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_state (
  id boolean primary key default true check (id),
  last_processed_round bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Bring any earlier launch tables up to the production column contract.
-- ADD COLUMN IF NOT EXISTS keeps this safe to run repeatedly.
alter table public.protocol_config
  add column if not exists id boolean default true,
  add column if not exists program_id text default 'supabase-mainnet-game',
  add column if not exists token_mint text,
  add column if not exists cluster text default 'mainnet-beta',
  add column if not exists current_round bigint default 0,
  add column if not exists available_pool_lamports bigint default 0,
  add column if not exists round_length_seconds bigint default 900,
  add column if not exists next_round_at timestamptz,
  add column if not exists round_active boolean default false,
  add column if not exists paused boolean default false,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists singleton boolean default true,
  add column if not exists last_indexed_slot bigint default 0;
alter table public.rounds
  add column if not exists round_number bigint,
  add column if not exists status text default 'open',
  add column if not exists opened_at timestamptz default now(),
  add column if not exists closes_at timestamptz default now(),
  add column if not exists claim_deadline timestamptz,
  add column if not exists pot_lamports bigint default 0,
  add column if not exists remaining_lamports bigint default 0,
  add column if not exists cooperate_weight numeric(40,0) default 0,
  add column if not exists defect_weight numeric(40,0) default 0,
  add column if not exists distribution_weight numeric(40,0) default 0,
  add column if not exists voter_count integer default 0,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists opens_at timestamptz default now(),
  add column if not exists commit_closes_at timestamptz default now(),
  add column if not exists reveal_closes_at timestamptz default now(),
  add column if not exists fee_pot_lamports bigint default 0,
  add column if not exists cooperate_weight_raw numeric(40,0) default 0,
  add column if not exists defect_weight_raw numeric(40,0) default 0,
  add column if not exists outcome text,
  add column if not exists settlement_signature text;
alter table public.holders
  add column if not exists wallet text,
  add column if not exists position_amount numeric(40,0) default 0,
  add column if not exists streak_started_at timestamptz,
  add column if not exists last_withdraw_at timestamptz,
  add column if not exists locked_until timestamptz,
  add column if not exists bonus_bps integer default 0,
  add column if not exists tier integer default 0,
  add column if not exists cooperate_votes integer default 0,
  add column if not exists defect_votes integer default 0,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists wallet_address text,
  add column if not exists token_balance_raw numeric(40,0) default 0,
  add column if not exists supply_bps integer default 0,
  add column if not exists streak_seconds bigint default 0,
  add column if not exists multiplier_bps integer default 10000,
  add column if not exists position_consistency_bps integer default 0,
  add column if not exists last_indexed_slot bigint default 0;
alter table public.reward_claims
  add column if not exists round_number bigint,
  add column if not exists wallet text,
  add column if not exists amount_lamports bigint default 0,
  add column if not exists claimed_at timestamptz default now(),
  add column if not exists transaction_signature text,
  add column if not exists wallet_address text,
  add column if not exists claimed boolean default true,
  add column if not exists claim_signature text;
alter table public.protocol_events
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists event_type text,
  add column if not exists round_number bigint,
  add column if not exists wallet text,
  add column if not exists detail text default '',
  add column if not exists transaction_signature text,
  add column if not exists occurred_at timestamptz default now(),
  add column if not exists signature text,
  add column if not exists slot bigint default 0,
  add column if not exists wallet_address text,
  add column if not exists data jsonb default '{}'::jsonb,
  add column if not exists block_time timestamptz,
  add column if not exists created_at timestamptz default now();
alter table public.feed_events
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists event_type text,
  add column if not exists round_number bigint,
  add column if not exists title text,
  add column if not exists detail text default '',
  add column if not exists tone text default 'neutral',
  add column if not exists occurred_at timestamptz default now();
alter table public.wallet_auth_nonces
  add column if not exists wallet text,
  add column if not exists message text,
  add column if not exists nonce_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists consumed_at timestamptz,
  add column if not exists created_at timestamptz default now();
alter table public.wallet_sessions
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists wallet text,
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists created_at timestamptz default now();
alter table public.worker_state
  add column if not exists id boolean default true,
  add column if not exists last_processed_round bigint default 0,
  add column if not exists updated_at timestamptz default now();

-- Normalize the legacy launch schema without dropping player or round data.
update public.protocol_config
set id = coalesce(id, singleton, true),
    singleton = coalesce(singleton, id, true),
    last_indexed_slot = coalesce(last_indexed_slot, 0),
    current_round = coalesce(current_round, 0),
    available_pool_lamports = coalesce(available_pool_lamports, 0),
    round_active = coalesce(round_active, false),
    paused = coalesce(paused, false),
    updated_at = coalesce(updated_at, now());

update public.holders
set wallet = coalesce(wallet, wallet_address),
    wallet_address = coalesce(wallet_address, wallet),
    position_amount = coalesce(position_amount, token_balance_raw, 0),
    token_balance_raw = coalesce(token_balance_raw, position_amount, 0),
    bonus_bps = coalesce(bonus_bps, greatest(coalesce(multiplier_bps, 10000) - 10000, 0)),
    multiplier_bps = coalesce(multiplier_bps, 10000 + coalesce(bonus_bps, 0)),
    supply_bps = coalesce(supply_bps, 0),
    streak_seconds = coalesce(streak_seconds, 0),
    position_consistency_bps = coalesce(position_consistency_bps, 0),
    last_indexed_slot = coalesce(last_indexed_slot, 0),
    updated_at = coalesce(updated_at, now());

update public.reward_claims
set wallet = coalesce(wallet, wallet_address),
    wallet_address = coalesce(wallet_address, wallet),
    transaction_signature = coalesce(transaction_signature, claim_signature),
    claim_signature = coalesce(claim_signature, transaction_signature),
    claimed = coalesce(claimed, true),
    claimed_at = coalesce(claimed_at, now());

update public.protocol_events
set wallet = coalesce(wallet, wallet_address),
    wallet_address = coalesce(wallet_address, wallet),
    transaction_signature = coalesce(transaction_signature, signature),
    signature = coalesce(signature, transaction_signature),
    detail = coalesce(nullif(detail, ''), data ->> 'detail', replace(event_type, '_', ' ')),
    data = coalesce(data, jsonb_build_object('detail', detail)),
    slot = coalesce(slot, 0),
    occurred_at = coalesce(occurred_at, block_time, created_at, now()),
    created_at = coalesce(created_at, occurred_at, now());

alter table public.protocol_config alter column singleton set default true;
alter table public.protocol_config alter column last_indexed_slot set default 0;
alter table public.rounds alter column opens_at set default now();
alter table public.rounds alter column commit_closes_at set default now();
alter table public.rounds alter column reveal_closes_at set default now();
alter table public.rounds alter column fee_pot_lamports set default 0;
alter table public.rounds alter column cooperate_weight_raw set default 0;
alter table public.rounds alter column defect_weight_raw set default 0;
alter table public.holders alter column token_balance_raw set default 0;
alter table public.holders alter column supply_bps set default 0;
alter table public.holders alter column streak_seconds set default 0;
alter table public.holders alter column multiplier_bps set default 10000;
alter table public.holders alter column position_consistency_bps set default 0;
alter table public.holders alter column last_indexed_slot set default 0;
alter table public.protocol_events alter column slot set default 0;
alter table public.protocol_events alter column data set default '{}'::jsonb;
alter table public.protocol_events alter column created_at set default now();

create unique index if not exists holders_wallet_unique on public.holders (wallet);
create unique index if not exists reward_claims_round_wallet_unique on public.reward_claims (round_number, wallet);

create or replace function public.normalize_holder_compatibility()
returns trigger language plpgsql set search_path = public as $$
begin
  new.wallet := coalesce(new.wallet, new.wallet_address);
  new.wallet_address := coalesce(new.wallet_address, new.wallet);
  new.position_amount := coalesce(new.position_amount, new.token_balance_raw, 0);
  new.token_balance_raw := coalesce(new.token_balance_raw, new.position_amount, 0);
  new.multiplier_bps := coalesce(new.multiplier_bps, 10000 + coalesce(new.bonus_bps, 0));
  new.supply_bps := coalesce(new.supply_bps, 0);
  new.streak_seconds := coalesce(new.streak_seconds, 0);
  new.position_consistency_bps := coalesce(new.position_consistency_bps, 0);
  new.last_indexed_slot := coalesce(new.last_indexed_slot, 0);
  return new;
end $$;
drop trigger if exists holders_compatibility on public.holders;
create trigger holders_compatibility before insert or update on public.holders for each row execute function public.normalize_holder_compatibility();

create or replace function public.normalize_reward_claim_compatibility()
returns trigger language plpgsql set search_path = public as $$
begin
  new.wallet := coalesce(new.wallet, new.wallet_address);
  new.wallet_address := coalesce(new.wallet_address, new.wallet);
  new.transaction_signature := coalesce(new.transaction_signature, new.claim_signature);
  new.claim_signature := coalesce(new.claim_signature, new.transaction_signature);
  new.claimed := coalesce(new.claimed, true);
  return new;
end $$;
drop trigger if exists reward_claims_compatibility on public.reward_claims;
create trigger reward_claims_compatibility before insert or update on public.reward_claims for each row execute function public.normalize_reward_claim_compatibility();

create or replace function public.normalize_protocol_event_compatibility()
returns trigger language plpgsql set search_path = public as $$
begin
  new.wallet := coalesce(new.wallet, new.wallet_address);
  new.wallet_address := coalesce(new.wallet_address, new.wallet);
  new.transaction_signature := coalesce(new.transaction_signature, new.signature);
  new.signature := coalesce(new.signature, new.transaction_signature);
  new.detail := coalesce(nullif(new.detail, ''), new.data ->> 'detail', replace(new.event_type, '_', ' '));
  new.data := coalesce(new.data, jsonb_build_object('detail', new.detail));
  new.slot := coalesce(new.slot, 0);
  new.occurred_at := coalesce(new.occurred_at, new.block_time, new.created_at, now());
  new.created_at := coalesce(new.created_at, new.occurred_at, now());
  return new;
end $$;
drop trigger if exists protocol_events_compatibility on public.protocol_events;
create trigger protocol_events_compatibility before insert or update on public.protocol_events for each row execute function public.normalize_protocol_event_compatibility();

create or replace function public.apply_confirmed_sweep(p_idempotency_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  sweep public.audit_log%rowtype;
begin
  select * into sweep from public.audit_log where idempotency_key = p_idempotency_key for update;
  if sweep.id is null or sweep.status <> 'confirmed' then
    raise exception 'sweep is not confirmed';
  end if;
  if coalesce((sweep.payload ->> 'credited')::boolean, false) then
    return false;
  end if;
  update public.protocol_config
  set available_pool_lamports = available_pool_lamports + coalesce((sweep.payload ->> 'boxAmountLamports')::bigint, sweep.amount_lamports),
      updated_at = now()
  where id = true;
  update public.audit_log
  set payload = payload || jsonb_build_object('credited', true), updated_at = now()
  where id = sweep.id;
  insert into public.protocol_events (event_type, detail, transaction_signature)
  values ('PUMP_FEES_COLLECTED', coalesce(sweep.payload ->> 'boxAmountLamports', sweep.amount_lamports::text) || ' lamports entered the live pot.', sweep.transaction_signature);
  return true;
end;
$$;

alter table public.protocol_config
  add column if not exists pot_rollover_count integer not null default 0,
  add column if not exists decision_window_seconds bigint not null default 900,
  add column if not exists cooperation_threshold_bps integer not null default 5000,
  add column if not exists failed_round_count integer not null default 0;
alter table public.protocol_config
  alter column round_length_seconds set default 900;
alter table public.rounds
  add column if not exists deal_budget_lamports bigint not null default 0,
  add column if not exists accepted_deals_lamports bigint not null default 0,
  add column if not exists hodl_pool_lamports bigint not null default 0,
  add column if not exists rollover_lamports bigint not null default 0,
  add column if not exists weighted_hodl_bps integer,
  add column if not exists force_open boolean not null default false,
  add column if not exists settled_at timestamptz;
alter table public.round_snapshots
  add column if not exists banker_offer_lamports bigint not null default 0,
  add column if not exists live_balance numeric(40,0),
  add column if not exists forced_no_hodl boolean not null default false,
  add column if not exists final_choice text,
  add column if not exists payout_lamports bigint not null default 0;
alter table public.holders
  add column if not exists leaderboard_score numeric(40,0) not null default 0,
  add column if not exists wins integer not null default 0,
  add column if not exists losses integer not null default 0,
  add column if not exists total_airdropped_lamports bigint not null default 0;

-- Older launch schemas used different reward-claim columns. Do not let that
-- optional backfill abort the launch migration.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reward_claims' and column_name = 'wallet')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reward_claims' and column_name = 'amount_lamports') then
    execute $sql$
      update public.holders h
      set total_airdropped_lamports = greatest(
        h.total_airdropped_lamports,
        coalesce((select sum(rc.amount_lamports)::bigint from public.reward_claims rc where rc.wallet = h.wallet), 0)
      )
    $sql$;
  end if;
end $$;

create or replace view public.public_leaderboard
with (security_invoker = true)
as
select
  row_number() over (
    order by h.leaderboard_score desc, h.total_airdropped_lamports desc, h.wallet asc
  ) as rank,
  h.wallet,
  h.leaderboard_score as score,
  case
    when h.streak_started_at is null then 'Paper Hands'
    when now() - h.streak_started_at >= interval '7 days' then 'Obsidian Hands'
    when now() - h.streak_started_at >= interval '1 day' then 'Diamond Hands'
    when now() - h.streak_started_at >= interval '2 hours' then 'Iron Hands'
    else 'Paper Hands'
  end as tier,
  h.total_airdropped_lamports,
  h.wins,
  h.losses
from public.holders h
where h.position_amount > 0;

create or replace function public.mirror_protocol_event_to_feed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feed_events (event_type, round_number, title, detail, tone, occurred_at)
  values (
    new.event_type,
    new.round_number,
    replace(new.event_type, '_', ' '),
    new.detail,
    case
      when new.event_type ~* '(ROLL|DEFECT|SELL|JEET|NO_HODL|CLOSED)' then 'defect'
      when new.event_type ~* '(OPEN|HODL|PAID|SETTLED)' then 'cooperate'
      when new.event_type ~* '(FEE|POT|SWEEP|BONUS)' then 'gold'
      else 'neutral'
    end,
    new.occurred_at
  );
  return new;
end;
$$;

drop trigger if exists protocol_events_to_feed on public.protocol_events;
create trigger protocol_events_to_feed
after insert on public.protocol_events
for each row execute function public.mirror_protocol_event_to_feed();

create index if not exists holders_streak_idx on public.holders (streak_started_at asc) where position_amount > 0;
create index if not exists protocol_events_time_idx on public.protocol_events (occurred_at desc);
create index if not exists feed_events_time_idx on public.feed_events (occurred_at desc);
create index if not exists round_votes_round_idx on public.round_votes (round_number, choice);
create index if not exists wallet_sessions_wallet_idx on public.wallet_sessions (wallet, expires_at desc);
create index if not exists round_snapshots_round_idx on public.round_snapshots (round_number, wallet);
create index if not exists sealed_choices_current_idx on public.sealed_choices (round_number, wallet, version desc) where superseded_at is null;
create index if not exists commitments_round_idx on public.commitments (round_number, created_at desc);
create index if not exists revealed_choices_round_idx on public.revealed_choices (round_number, wallet);
create index if not exists audience_signals_round_idx on public.audience_signals (round_number, choice);
create index if not exists audit_log_round_idx on public.audit_log (round_number, action, status);

alter table public.protocol_config enable row level security;
alter table public.rounds enable row level security;
alter table public.holders enable row level security;
alter table public.round_votes enable row level security;
alter table public.reward_claims enable row level security;
alter table public.protocol_events enable row level security;
alter table public.feed_events enable row level security;
alter table public.wallet_auth_nonces enable row level security;
alter table public.wallet_sessions enable row level security;
alter table public.round_snapshots enable row level security;
alter table public.sealed_choices enable row level security;
alter table public.commitments enable row level security;
alter table public.revealed_choices enable row level security;
alter table public.audience_signals enable row level security;
alter table public.audit_log enable row level security;
alter table public.worker_state enable row level security;

drop policy if exists "public config read" on public.protocol_config;
create policy "public config read" on public.protocol_config for select using (true);
drop policy if exists "public rounds read" on public.rounds;
create policy "public rounds read" on public.rounds for select using (true);
drop policy if exists "public holders read" on public.holders;
create policy "public holders read" on public.holders for select using (true);
drop policy if exists "public votes read" on public.round_votes;
drop policy if exists "public claims read" on public.reward_claims;
create policy "public claims read" on public.reward_claims for select using (true);
drop policy if exists "public events read" on public.protocol_events;
create policy "public events read" on public.protocol_events for select using (true);
drop policy if exists "public feed read" on public.feed_events;
create policy "public feed read" on public.feed_events for select using (true);
grant select on public.feed_events to anon, authenticated;
grant select on public.public_leaderboard to anon, authenticated;

-- Nonces and sessions are service-role only. Snapshot balances are public game
-- state, but auth material is never exposed to browser clients.
drop policy if exists "public snapshots read" on public.round_snapshots;
create policy "public snapshots read" on public.round_snapshots for select using (true);
grant select on public.round_snapshots to anon, authenticated;
drop policy if exists "public commitments read" on public.commitments;
create policy "public commitments read" on public.commitments for select using (true);
drop policy if exists "public reveals read" on public.revealed_choices;
create policy "public reveals read" on public.revealed_choices for select using (true);
grant select on public.commitments, public.revealed_choices to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.protocol_config;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.rounds;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.holders;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.protocol_events;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.feed_events;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.commitments;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.revealed_choices;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Bingo game state
-- ---------------------------------------------------------------------------

create table if not exists public.bingo_config (
  id boolean primary key default true check (id),
  token_mint text not null,
  cluster text not null default 'mainnet-beta',
  current_game bigint not null default 0,
  main_pool_lamports bigint not null default 0,
  jackpot_pool_lamports bigint not null default 0,
  game_length_seconds integer not null default 900,
  intermission_seconds integer not null default 60,
  calls_per_game integer not null default 12,
  jackpot_odds integer not null default 25,
  next_game_at timestamptz,
  game_active boolean not null default false,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);

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

create table if not exists public.bingo_games (
  game_number bigint primary key,
  status text not null check (status in ('open','drawing','settled','rolled_over','failed')),
  opened_at timestamptz not null,
  closes_at timestamptz not null,
  snapshot_slot bigint not null default 0,
  seed_commitment text not null,
  seed_reveal text,
  called_numbers integer[] not null default '{}',
  calls_per_game integer not null,
  player_count integer not null default 0,
  card_count integer not null default 0,
  main_pot_lamports bigint not null default 0,
  jackpot_pot_lamports bigint not null default 0,
  rollover_lamports bigint not null default 0,
  winner_wallet text,
  winner_card_index integer,
  winner_card integer[],
  winning_call_index integer,
  payout_lamports bigint not null default 0,
  jackpot_triggered boolean not null default false,
  jackpot_payout_lamports bigint not null default 0,
  settlement_signature text,
  settled_at timestamptz,
  updated_at timestamptz not null default now()
);

-- The draw seed remains service-role-only until settlement. The public
-- commitment is written to bingo_games at game open and the seed is revealed
-- only after calls and the winner are final.
create table if not exists public.bingo_game_secrets (
  game_number bigint primary key references public.bingo_games(game_number) on delete cascade,
  draw_seed text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bingo_entries (
  game_number bigint not null references public.bingo_games(game_number) on delete cascade,
  wallet text not null,
  snapshot_balance numeric(40,0) not null,
  card_count integer not null check (card_count > 0),
  created_at timestamptz not null default now(),
  primary key (game_number, wallet)
);

create table if not exists public.bingo_payouts (
  game_number bigint not null references public.bingo_games(game_number) on delete cascade,
  wallet text not null,
  payout_kind text not null check (payout_kind in ('main','jackpot')),
  amount_lamports bigint not null check (amount_lamports >= 0),
  idempotency_key text not null unique,
  status text not null check (status in ('dry_run','broadcast','confirmed','failed')),
  transaction_signature text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_number, wallet, payout_kind)
);

alter table public.holders
  add column if not exists card_count integer not null default 0,
  add column if not exists bingo_wins integer not null default 0,
  add column if not exists jackpot_wins integer not null default 0;

create index if not exists bingo_games_status_idx on public.bingo_games (status, closes_at);
create index if not exists bingo_entries_game_idx on public.bingo_entries (game_number, card_count desc);
create index if not exists bingo_entries_wallet_idx on public.bingo_entries (wallet, game_number desc);
create index if not exists bingo_payouts_game_idx on public.bingo_payouts (game_number, status);

create or replace function public.apply_confirmed_bingo_sweep(p_idempotency_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  sweep public.audit_log%rowtype;
begin
  select * into sweep
  from public.audit_log
  where idempotency_key = p_idempotency_key
  for update;

  if sweep.id is null or sweep.status <> 'confirmed' then
    raise exception 'sweep is not confirmed';
  end if;
  if coalesce((sweep.payload ->> 'bingoCredited')::boolean, false) then
    return false;
  end if;

  update public.bingo_config
  set main_pool_lamports = main_pool_lamports + coalesce((sweep.payload ->> 'mainAmountLamports')::bigint, 0),
      jackpot_pool_lamports = jackpot_pool_lamports + coalesce((sweep.payload ->> 'jackpotAmountLamports')::bigint, 0),
      updated_at = now()
  where id = true;

  update public.audit_log
  set payload = payload || jsonb_build_object('bingoCredited', true),
      updated_at = now()
  where id = sweep.id;

  insert into public.protocol_events (event_type, detail, transaction_signature)
  values (
    'BINGO_FEES_COLLECTED',
    coalesce(sweep.payload ->> 'mainAmountLamports', '0') || ' lamports entered the main draw.',
    sweep.transaction_signature
  );
  return true;
end;
$$;

create or replace function public.open_bingo_game(
  p_game_number bigint,
  p_opened_at timestamptz,
  p_closes_at timestamptz,
  p_snapshot_slot bigint,
  p_seed text,
  p_seed_commitment text,
  p_calls_per_game integer,
  p_main_pot_lamports bigint,
  p_jackpot_pot_lamports bigint,
  p_entries jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  config public.bingo_config%rowtype;
  entry jsonb;
  total_cards integer := 0;
  player_count integer := 0;
begin
  select * into config
  from public.bingo_config
  where id = true
  for update;

  if config.id is null then
    raise exception 'bingo config is missing';
  end if;
  if config.game_active or p_game_number <= config.current_game then
    return false;
  end if;
  if p_main_pot_lamports <= 0 or jsonb_array_length(p_entries) = 0 then
    return false;
  end if;

  select count(*)::integer, coalesce(sum((item ->> 'cardCount')::integer), 0)::integer
  into player_count, total_cards
  from jsonb_array_elements(p_entries) item;

  insert into public.bingo_games (
    game_number, status, opened_at, closes_at, snapshot_slot,
    seed_commitment, called_numbers, calls_per_game, player_count,
    card_count, main_pot_lamports, jackpot_pot_lamports, updated_at
  ) values (
    p_game_number, 'open', p_opened_at, p_closes_at, p_snapshot_slot,
    p_seed_commitment, '{}', p_calls_per_game, player_count,
    total_cards, p_main_pot_lamports, p_jackpot_pot_lamports, now()
  );

  insert into public.bingo_game_secrets (game_number, draw_seed)
  values (p_game_number, p_seed);

  for entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into public.bingo_entries (game_number, wallet, snapshot_balance, card_count)
    values (
      p_game_number,
      entry ->> 'wallet',
      (entry ->> 'balance')::numeric,
      (entry ->> 'cardCount')::integer
    );

    insert into public.holders (
      wallet, wallet_address, position_amount, token_balance_raw,
      card_count, leaderboard_score, updated_at
    ) values (
      entry ->> 'wallet',
      entry ->> 'wallet',
      (entry ->> 'balance')::numeric,
      (entry ->> 'balance')::numeric,
      (entry ->> 'cardCount')::integer,
      (entry ->> 'balance')::numeric,
      now()
    )
    on conflict (wallet) do update set
      wallet_address = excluded.wallet_address,
      position_amount = excluded.position_amount,
      token_balance_raw = excluded.token_balance_raw,
      card_count = excluded.card_count,
      leaderboard_score = excluded.leaderboard_score,
      updated_at = now();
  end loop;

  update public.bingo_config
  set current_game = p_game_number,
      main_pool_lamports = 0,
      jackpot_pool_lamports = 0,
      next_game_at = p_closes_at,
      game_active = true,
      updated_at = now()
  where id = true;

  return true;
end;
$$;

create or replace function public.finalize_bingo_game(
  p_game_number bigint,
  p_called_numbers integer[],
  p_seed_reveal text,
  p_winner_wallet text,
  p_winner_card_index integer,
  p_winner_card integer[],
  p_winning_call_index integer,
  p_main_payout_lamports bigint,
  p_jackpot_triggered boolean,
  p_jackpot_payout_lamports bigint,
  p_settlement_signature text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  game public.bingo_games%rowtype;
begin
  select * into game
  from public.bingo_games
  where game_number = p_game_number
  for update;

  if game.game_number is null then
    raise exception 'bingo game is missing';
  end if;
  if game.status in ('settled', 'rolled_over') then
    return false;
  end if;

  update public.bingo_games
  set status = case when p_winner_wallet is null then 'rolled_over' else 'settled' end,
      seed_reveal = p_seed_reveal,
      called_numbers = p_called_numbers,
      rollover_lamports = case when p_winner_wallet is null then game.main_pot_lamports else 0 end,
      winner_wallet = p_winner_wallet,
      winner_card_index = p_winner_card_index,
      winner_card = p_winner_card,
      winning_call_index = p_winning_call_index,
      payout_lamports = p_main_payout_lamports,
      jackpot_triggered = p_jackpot_triggered,
      jackpot_payout_lamports = p_jackpot_payout_lamports,
      settlement_signature = p_settlement_signature,
      settled_at = now(),
      updated_at = now()
  where game_number = p_game_number;

  update public.bingo_config
  set main_pool_lamports = main_pool_lamports
        + case when p_winner_wallet is null then game.main_pot_lamports else 0 end,
      jackpot_pool_lamports = jackpot_pool_lamports
        + case when p_jackpot_triggered then 0 else game.jackpot_pot_lamports end,
      game_active = false,
      next_game_at = now() + make_interval(secs => greatest(intermission_seconds, 0)),
      updated_at = now()
  where id = true;

  if p_winner_wallet is not null then
    update public.holders
    set bingo_wins = bingo_wins + 1,
        jackpot_wins = jackpot_wins + case when p_jackpot_triggered then 1 else 0 end,
        total_airdropped_lamports = total_airdropped_lamports
          + p_main_payout_lamports + p_jackpot_payout_lamports,
        updated_at = now()
    where wallet = p_winner_wallet;
  end if;

  return true;
end;
$$;

revoke all on function public.apply_confirmed_bingo_sweep(text) from public;
revoke all on function public.open_bingo_game(bigint, timestamptz, timestamptz, bigint, text, text, integer, bigint, bigint, jsonb) from public;
revoke all on function public.finalize_bingo_game(bigint, integer[], text, text, integer, integer[], integer, bigint, boolean, bigint, text) from public;
revoke execute on function public.apply_confirmed_bingo_sweep(text) from anon, authenticated;
revoke execute on function public.open_bingo_game(bigint, timestamptz, timestamptz, bigint, text, text, integer, bigint, bigint, jsonb) from anon, authenticated;
revoke execute on function public.finalize_bingo_game(bigint, integer[], text, text, integer, integer[], integer, bigint, boolean, bigint, text) from anon, authenticated;
grant execute on function public.apply_confirmed_bingo_sweep(text) to service_role;
grant execute on function public.open_bingo_game(bigint, timestamptz, timestamptz, bigint, text, text, integer, bigint, bigint, jsonb) to service_role;
grant execute on function public.finalize_bingo_game(bigint, integer[], text, text, integer, integer[], integer, bigint, boolean, bigint, text) to service_role;

create or replace view public.public_leaderboard
with (security_invoker = true)
as
select
  row_number() over (
    order by h.bingo_wins desc, h.total_airdropped_lamports desc, h.position_amount desc, h.wallet asc
  ) as rank,
  h.wallet,
  h.position_amount as score,
  h.card_count::text || case when h.card_count = 1 then ' card' else ' cards' end as tier,
  h.total_airdropped_lamports,
  h.bingo_wins as wins,
  h.jackpot_wins as losses
from public.holders h
where h.position_amount > 0 and h.card_count > 0;

alter table public.bingo_config enable row level security;
alter table public.bingo_games enable row level security;
alter table public.bingo_game_secrets enable row level security;
alter table public.bingo_entries enable row level security;
alter table public.bingo_payouts enable row level security;

drop policy if exists "public bingo config read" on public.bingo_config;
create policy "public bingo config read" on public.bingo_config for select using (true);
drop policy if exists "public bingo games read" on public.bingo_games;
create policy "public bingo games read" on public.bingo_games for select using (true);
drop policy if exists "public bingo entries read" on public.bingo_entries;
create policy "public bingo entries read" on public.bingo_entries for select using (true);
drop policy if exists "public bingo payouts read" on public.bingo_payouts;
create policy "public bingo payouts read" on public.bingo_payouts for select using (true);

grant select on public.bingo_config, public.bingo_games, public.bingo_entries, public.bingo_payouts to anon, authenticated;
grant select on public.public_leaderboard to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.bingo_config;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.bingo_games;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.bingo_entries;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.bingo_payouts;
exception when duplicate_object then null; end $$;

-- Make newly added tables and columns immediately visible to PostgREST.
notify pgrst, 'reload schema';
