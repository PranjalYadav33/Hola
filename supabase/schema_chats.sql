-- Supabase schema for Halo chats (conversations, participants, messages, receipts)
-- Run this in Supabase SQL Editor after applying schema.sql

begin;

create extension if not exists pgcrypto;

-- Tables
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group')),
  title text,
  avatar_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table if not exists public.participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

alter table public.participants enable row level security;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete set null,
  content_type text not null default 'text' check (content_type in ('text','media','system')),
  text_content text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null
);

alter table public.messages enable row level security;

create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('delivered','read')),
  at timestamptz not null default now(),
  primary key (message_id, user_id, type)
);

alter table public.message_receipts enable row level security;

-- Helper function (Moved to after table creation)
create or replace function public.is_conversation_participant(conv_id uuid, uid uuid default auth.uid())
returns boolean language sql stable as $$
  select exists(
    select 1 from public.participants p
    where p.conversation_id = conv_id and p.user_id = uid
  );
$$;

-- Policies
-- conversations: visible to participants; creator can insert
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
for select using (
  exists (
    select 1 from public.participants p
    where p.conversation_id = conversations.id
      and p.user_id = auth.uid()
  )
);

drop policy if exists conversations_insert_self on public.conversations;
create policy conversations_insert_self on public.conversations
for insert with check (auth.uid() = created_by);

-- participants: members can see; user can insert/update their own row
drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants
for select using (user_id = auth.uid());

drop policy if exists participants_insert_self on public.participants;
create policy participants_insert_self on public.participants
for insert with check (auth.uid() = user_id);

-- Admins of a conversation can add other participants
drop policy if exists participants_insert_admin on public.participants;
create policy participants_insert_admin on public.participants
for insert with check (
  exists (
    select 1 from public.participants ap
    where ap.conversation_id = participants.conversation_id
      and ap.user_id = auth.uid()
      and ap.role = 'admin'
  )
);

drop policy if exists participants_update_self on public.participants;
create policy participants_update_self on public.participants
for update using (auth.uid() = user_id);

-- messages: participants can read; only participants can send as themselves
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
for select using (
  exists (
    select 1 from public.participants p
    where p.conversation_id = messages.conversation_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages
for insert with check (
  auth.uid() = sender_user_id and exists (
    select 1 from public.participants p
    where p.conversation_id = messages.conversation_id
      and p.user_id = auth.uid()
  )
);

-- Allow authors to edit (and soft-delete via update)
drop policy if exists messages_update_self on public.messages;
create policy messages_update_self on public.messages
for update using (
  auth.uid() = sender_user_id and exists (
    select 1 from public.participants p
    where p.conversation_id = messages.conversation_id
      and p.user_id = auth.uid()
  )
);

-- receipts: participants only; user can insert their own receipts
drop policy if exists receipts_select on public.message_receipts;
create policy receipts_select on public.message_receipts
for select using (
  public.is_conversation_participant((select conversation_id from public.messages m where m.id = message_id))
);

drop policy if exists receipts_insert_self on public.message_receipts;
create policy receipts_insert_self on public.message_receipts
for insert with check (
  auth.uid() = user_id and public.is_conversation_participant((select conversation_id from public.messages m where m.id = message_id))
);

-- Trigger: add creator as participant (admin)
create or replace function public.add_creator_participant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.participants(conversation_id, user_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_add_creator on public.conversations;
create trigger conversations_add_creator
after insert on public.conversations
for each row execute procedure public.add_creator_participant();

-- RPC: ensure a direct conversation exists between current user and other_user_id
create or replace function public.ensure_direct_conversation(other_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  conv uuid;
  me uuid := auth.uid();
begin
  if other_user_id is null then
    raise exception 'other_user_id is required';
  end if;
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = other_user_id then
    raise exception 'cannot start conversation with yourself';
  end if;

  select c.id into conv
  from public.conversations c
  join public.participants p1 on p1.conversation_id = c.id and p1.user_id = me
  join public.participants p2 on p2.conversation_id = c.id and p2.user_id = other_user_id
  where c.type = 'direct'
  limit 1;

  if conv is not null then
    return conv;
  end if;

  insert into public.conversations(type, created_by)
  values ('direct', me)
  returning id into conv;

  -- creator is added by trigger; add the other participant
  insert into public.participants(conversation_id, user_id, role)
  values (conv, other_user_id, 'member')
  on conflict do nothing;

  return conv;
end;
$$;

grant execute on function public.ensure_direct_conversation(uuid) to authenticated;

-- Enable Realtime replication for messages (required for postgres_changes subscriptions)
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages';
  if not found then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;

-- Reactions
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

drop policy if exists reactions_select on public.message_reactions;
create policy reactions_select on public.message_reactions
for select using (
  exists (
    select 1 from public.participants p
    join public.messages m on m.id = message_id
    where p.conversation_id = m.conversation_id and p.user_id = auth.uid()
  )
);

drop policy if exists reactions_insert on public.message_reactions;
create policy reactions_insert on public.message_reactions
for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.participants p
    join public.messages m on m.id = message_id
    where p.conversation_id = m.conversation_id and p.user_id = auth.uid()
  )
);

drop policy if exists reactions_delete_self on public.message_reactions;
create policy reactions_delete_self on public.message_reactions
for delete using (auth.uid() = user_id);

-- Attachments
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  bucket text not null default 'attachments',
  path text not null,
  content_type text,
  size_bytes integer,
  width integer,
  height integer,
  duration_sec numeric,
  created_at timestamptz not null default now()
);

alter table public.message_attachments enable row level security;

drop policy if exists attachments_select on public.message_attachments;
create policy attachments_select on public.message_attachments
for select using (
  exists (
    select 1 from public.participants p
    join public.messages m on m.id = message_id
    where p.conversation_id = m.conversation_id and p.user_id = auth.uid()
  )
);

drop policy if exists attachments_insert on public.message_attachments;
create policy attachments_insert on public.message_attachments
for insert with check (
  exists (
    select 1 from public.participants p
    join public.messages m on m.id = message_id
    where p.conversation_id = m.conversation_id and p.user_id = auth.uid()
  )
);

-- Full-text search for messages
create index if not exists idx_messages_tsv on public.messages using GIN (to_tsvector('english', coalesce(text_content,'')));

create or replace function public.search_messages(q text, conv uuid default null)
returns table(id uuid, conversation_id uuid, sender_user_id uuid, text_content text, created_at timestamptz, rank double precision)
language sql stable security definer set search_path = public as $$
  with t as (
    select m.id, m.conversation_id, m.sender_user_id, m.text_content, m.created_at,
           ts_rank_cd(to_tsvector('english', coalesce(m.text_content,'')), plainto_tsquery('english', q)) as rank
    from public.messages m
    where m.deleted_at is null
      and (conv is null or m.conversation_id = conv)
      and to_tsvector('english', coalesce(m.text_content,'')) @@ plainto_tsquery('english', q)
      and exists (
        select 1 from public.participants p
        where p.conversation_id = m.conversation_id and p.user_id = auth.uid()
      )
  )
  select * from t order by rank desc, created_at desc limit 50;
$$;

grant execute on function public.search_messages(text, uuid) to authenticated;

-- RPC: get other participant user_ids for a list of conversations (SECURITY DEFINER)
create or replace function public.get_direct_partners(conv_ids uuid[])
returns table(conversation_id uuid, user_id uuid)
language sql stable security definer set search_path = public as $$
  select p.conversation_id, p.user_id
  from public.participants p
  where p.conversation_id = any(conv_ids)
    and p.user_id <> auth.uid();
$$;

grant execute on function public.get_direct_partners(uuid[]) to authenticated;

-- Add participants to Realtime publication for live chat list updates
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'participants';
  if not found then
    execute 'alter publication supabase_realtime add table public.participants';
  end if;
end $$;

-- Add reactions and attachments to Realtime publication
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions';
  if not found then
    execute 'alter publication supabase_realtime add table public.message_reactions';
  end if;
end $$;

do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_attachments';
  if not found then
    execute 'alter publication supabase_realtime add table public.message_attachments';
  end if;
end $$;

-- Helpful indexes
create index if not exists idx_participants_user on public.participants(user_id);
create index if not exists idx_participants_conversation on public.participants(conversation_id);
create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at);

commit;