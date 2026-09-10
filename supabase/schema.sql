-- Harmonkia: practice history
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → Run).

create table if not exists public.attempts (
  id          text primary key,                 -- generated on the client; makes re-pushes idempotent
  user_id     uuid not null references auth.users (id) on delete cascade,
  song_id     text not null,
  at          bigint not null,                  -- Unix time in ms (Date.now())
  mode        text not null check (mode in ('free', 'tempo')),
  speed       integer not null,
  line_from   integer not null,
  line_to     integer not null,
  total       integer not null,
  hits        integer not null,
  mistakes    jsonb not null default '[]'::jsonb,
  clean       boolean not null,
  duration    real not null,
  created_at  timestamptz not null default now()
);

create index if not exists attempts_user_at on public.attempts (user_id, at);

-- Row Level Security: each user sees and writes only their own rows.
alter table public.attempts enable row level security;

drop policy if exists "attempts: read own" on public.attempts;
create policy "attempts: read own"
  on public.attempts for select
  using (auth.uid() = user_id);

drop policy if exists "attempts: insert own" on public.attempts;
create policy "attempts: insert own"
  on public.attempts for insert
  with check (auth.uid() = user_id);

-- No UPDATE policy on purpose: attempts are immutable events.
-- Deletion is allowed so "delete all my data" works.
drop policy if exists "attempts: delete own" on public.attempts;
create policy "attempts: delete own"
  on public.attempts for delete
  using (auth.uid() = user_id);
