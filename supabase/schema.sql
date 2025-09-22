-- Supabase schema for Halo app (initial)
-- Run this in Supabase SQL Editor

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  about text,
  last_seen_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Public can read minimal profile fields
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
for select using (true);

-- Only the authenticated user can insert/update/delete their own row
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

drop policy if exists "profiles_delete_self" on public.profiles;
create policy "profiles_delete_self" on public.profiles
for delete using (auth.uid() = id);

-- Keep updated_at fresh
create or replace function public.handle_profiles_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_profiles_updated();

commit;