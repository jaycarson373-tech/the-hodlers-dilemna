-- Hodlers Dilemma.fun mainnet game model.
-- Railway is the only writer; the public site reads this state.

create extension if not exists pgcrypto;

create table if not exists public.protocol_config (
  id boolean primary key default true check (id),
  program_id text not null,
  token_mint text not null,
  cluster text not null default 'mainnet-beta',
  current_round bigint not null default 0,
  available_pool_lamports bigint not null default 0,
  round_length_seconds bigint not null default 3600,
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

create index if not exists holders_streak_idx on public.holders (streak_started_at asc) where position_amount > 0;
create index if not exists protocol_events_time_idx on public.protocol_events (occurred_at desc);
create index if not exists round_votes_round_idx on public.round_votes (round_number, choice);

alter table public.protocol_config enable row level security;
alter table public.rounds enable row level security;
alter table public.holders enable row level security;
alter table public.round_votes enable row level security;
alter table public.reward_claims enable row level security;
alter table public.protocol_events enable row level security;

drop policy if exists "public config read" on public.protocol_config;
create policy "public config read" on public.protocol_config for select using (true);
drop policy if exists "public rounds read" on public.rounds;
create policy "public rounds read" on public.rounds for select using (true);
drop policy if exists "public holders read" on public.holders;
create policy "public holders read" on public.holders for select using (true);
drop policy if exists "public votes read" on public.round_votes;
create policy "public votes read" on public.round_votes for select using (true);
drop policy if exists "public claims read" on public.reward_claims;
create policy "public claims read" on public.reward_claims for select using (true);
drop policy if exists "public events read" on public.protocol_events;
create policy "public events read" on public.protocol_events for select using (true);

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
