-- 第二阶段：可重复执行的修复迁移。
-- 安全地补齐 20260804_minimal_pair_sync.sql 的半完成状态；不删除业务表、
-- Auth 用户或已完成训练。可在 Supabase SQL Editor 完整重复执行。

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'member_role' and typnamespace = 'public'::regnamespace
  ) then
    create type public.member_role as enum ('fish', 'cat');
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.member_role not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  fish_id uuid not null references public.profiles(id) on delete cascade,
  cat_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (fish_id <> cat_id)
);

create table if not exists public.completed_training_sessions (
  session_id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_role public.member_role not null,
  question_type text not null,
  subtype text not null,
  question_count integer not null check (question_count > 0),
  generator_version text not null,
  grading_version text not null,
  rating_version text not null,
  schema_version integer not null,
  session_data jsonb not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  check ((session_data ->> 'id')::uuid = session_id),
  check (session_data ->> 'status' = 'completed')
);

-- These unique indexes also protect the one-fish / one-cat invariant when a
-- previous attempt created the tables but did not reach later constraints.
create unique index if not exists profiles_email_unique_idx on public.profiles (email);
create unique index if not exists profiles_role_unique_idx on public.profiles (role);
create unique index if not exists pairs_fish_unique_idx on public.pairs (fish_id);
create unique index if not exists pairs_cat_unique_idx on public.pairs (cat_id);
create index if not exists completed_training_sessions_owner_completed_idx
  on public.completed_training_sessions (owner_id, completed_at desc);

alter table public.profiles enable row level security;
alter table public.pairs enable row level security;
alter table public.completed_training_sessions enable row level security;

-- Recreate only policies/triggers/functions. This changes authorization code,
-- not persisted profile, pairing, Auth, or completed-session data.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "read paired completed sessions" on public.completed_training_sessions;
create policy "read paired completed sessions" on public.completed_training_sessions
  for select to authenticated using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.pairs p
      where (p.fish_id = auth.uid() and p.cat_id = owner_id)
         or (p.cat_id = auth.uid() and p.fish_id = owner_id)
    )
  );

create or replace function public.ensure_fixed_pair()
returns void language plpgsql security definer set search_path = public as $$
declare fish uuid; cat uuid;
begin
  select id into fish from public.profiles where role = 'fish';
  select id into cat from public.profiles where role = 'cat';
  if fish is not null and cat is not null then
    insert into public.pairs (fish_id, cat_id) values (fish, cat)
      on conflict (fish_id) do nothing;
  end if;
end;
$$;

create or replace function public.assign_fixed_profile()
returns trigger language plpgsql security definer set search_path = public as $$
declare normalized_email text := lower(new.email);
begin
  if normalized_email = '15535373352@163.com' then
    insert into public.profiles (id, email, role) values (new.id, normalized_email, 'fish')
      on conflict (id) do nothing;
  elsif normalized_email = 'jidain@163.com' then
    insert into public.profiles (id, email, role) values (new.id, normalized_email, 'cat')
      on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.link_fixed_pair_after_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_fixed_pair();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_assign_fixed_profile on auth.users;
create trigger on_auth_user_created_assign_fixed_profile
  after insert on auth.users for each row execute procedure public.assign_fixed_profile();

drop trigger if exists on_profile_created_link_fixed_pair on public.profiles;
create trigger on_profile_created_link_fixed_pair
  after insert on public.profiles for each row execute procedure public.link_fixed_pair_after_profile();

-- Safe backfill: preserves an existing profile row and never touches users
-- outside the two explicitly assigned accounts.
insert into public.profiles (id, email, role)
select id, lower(email), case lower(email)
  when '15535373352@163.com' then 'fish'::public.member_role
  when 'jidain@163.com' then 'cat'::public.member_role
end
from auth.users
where lower(email) in ('15535373352@163.com', 'jidain@163.com')
on conflict (id) do nothing;

select public.ensure_fixed_pair();

create or replace function public.sync_completed_training_session(
  p_session_id uuid, p_session_data jsonb, p_generator_version text,
  p_grading_version text, p_rating_version text, p_schema_version integer
)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_profile public.profiles%rowtype; existing_owner uuid;
begin
  select * into current_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Account is not an assigned pair member'; end if;
  if p_session_data ->> 'id' <> p_session_id::text or p_session_data ->> 'status' <> 'completed' then
    raise exception 'Only frozen completed sessions can be synchronized';
  end if;
  select owner_id into existing_owner from public.completed_training_sessions where session_id = p_session_id;
  if found then
    if existing_owner <> auth.uid() then raise exception 'Session belongs to another account'; end if;
    return true;
  end if;
  insert into public.completed_training_sessions (
    session_id, owner_id, owner_role, question_type, subtype, question_count,
    generator_version, grading_version, rating_version, schema_version, session_data, completed_at
  ) values (
    p_session_id, auth.uid(), current_profile.role, p_session_data ->> 'questionType',
    p_session_data ->> 'subtype', coalesce((p_session_data ->> 'questionCount')::integer,
    jsonb_array_length(p_session_data -> 'questions')), p_generator_version, p_grading_version,
    p_rating_version, p_schema_version, p_session_data,
    to_timestamp((p_session_data ->> 'startedAt')::double precision / 1000)
  );
  return true;
end;
$$;

revoke all on function public.sync_completed_training_session(uuid, jsonb, text, text, text, integer) from public;
grant execute on function public.sync_completed_training_session(uuid, jsonb, text, text, text, integer) to authenticated;

-- Read-only post-run diagnostic. It is intentionally the final statement so
-- the result can be copied if a later setup check needs it.
select
  (select count(*) from public.profiles) as assigned_profiles,
  (select count(*) from public.pairs) as fixed_pairs,
  (select count(*) from public.completed_training_sessions) as completed_sessions;
