-- Pawgress Supabase migration
-- Apply this file in the linked Supabase project before enabling production sync.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 24),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  day smallint not null check (day between 1 and 30),
  completed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, day)
);

create table if not exists public.field_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day smallint not null check (day between 1 and 30),
  content text not null check (char_length(btrim(content)) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, day)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  link text not null default '',
  category text not null default 'Side quest',
  status text not null default 'Idea' check (status in ('Idea', 'In progress', 'Shipped')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_pawgress_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_pawgress_updated_at();

drop trigger if exists field_notes_set_updated_at on public.field_notes;
create trigger field_notes_set_updated_at
before update on public.field_notes
for each row execute function public.set_pawgress_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_pawgress_updated_at();

alter table public.profiles enable row level security;
alter table public.mission_progress enable row level security;
alter table public.field_notes enable row level security;
alter table public.projects enable row level security;

drop policy if exists "profiles_owner_only" on public.profiles;
create policy "profiles_owner_only" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "mission_progress_owner_only" on public.mission_progress;
create policy "mission_progress_owner_only" on public.mission_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "field_notes_owner_only" on public.field_notes;
create policy "field_notes_owner_only" on public.field_notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "projects_owner_only" on public.projects;
create policy "projects_owner_only" on public.projects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.mission_progress to authenticated;
grant select, insert, update, delete on public.field_notes to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
