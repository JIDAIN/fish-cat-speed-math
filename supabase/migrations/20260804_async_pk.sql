-- Async PK stage. Safe to run repeatedly after the minimal pair-sync migration.
-- It never deletes Auth users, profiles, pairs, completed training, or PK data.

create table if not exists public.pk_challenges (
  id uuid primary key default gen_random_uuid(),
  source_session_id uuid not null unique references public.completed_training_sessions(session_id) on delete restrict,
  challenger_id uuid not null references public.profiles(id) on delete restrict,
  challenger_role public.member_role not null,
  opponent_id uuid not null references public.profiles(id) on delete restrict,
  opponent_role public.member_role not null,
  frozen_session jsonb not null,
  opponent_session_id uuid unique references public.completed_training_sessions(session_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (challenger_id <> opponent_id),
  check (frozen_session ->> 'id' = source_session_id::text),
  check ((status = 'completed') = (opponent_session_id is not null)),
  check ((status = 'completed') = (completed_at is not null))
);

create table if not exists public.pk_result_receipts (
  challenge_id uuid not null references public.pk_challenges(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (challenge_id, account_id)
);

create index if not exists pk_challenges_opponent_pending_idx
  on public.pk_challenges (opponent_id, status, created_at desc);
create index if not exists pk_challenges_completed_idx
  on public.pk_challenges (completed_at desc) where status = 'completed';

alter table public.pk_challenges enable row level security;
alter table public.pk_result_receipts enable row level security;

drop policy if exists "read own pair pk challenges" on public.pk_challenges;
create policy "read own pair pk challenges" on public.pk_challenges
  for select to authenticated
  using (challenger_id = auth.uid() or opponent_id = auth.uid());

drop policy if exists "read own pk result receipts" on public.pk_result_receipts;
create policy "read own pk result receipts" on public.pk_result_receipts
  for select to authenticated using (account_id = auth.uid());

create or replace function public.pair_opponent(p_account uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when fish_id = p_account then cat_id else fish_id end
  from public.pairs
  where fish_id = p_account or cat_id = p_account
  limit 1;
$$;

create or replace function public.create_pk_challenge(p_source_session_id uuid)
returns public.pk_challenges language plpgsql security definer set search_path = public as $$
declare source_row public.completed_training_sessions%rowtype;
declare opponent uuid; opponent_profile public.profiles%rowtype; result public.pk_challenges%rowtype;
begin
  select * into source_row from public.completed_training_sessions
    where session_id = p_source_session_id and owner_id = auth.uid();
  if not found then raise exception 'Only your synchronized completed training can start a PK'; end if;
  opponent := public.pair_opponent(auth.uid());
  if opponent is null then raise exception 'This account has no fixed paired opponent'; end if;
  select * into opponent_profile from public.profiles where id = opponent;
  insert into public.pk_challenges (
    source_session_id, challenger_id, challenger_role, opponent_id, opponent_role, frozen_session
  ) values (
    source_row.session_id, auth.uid(), source_row.owner_role, opponent, opponent_profile.role, source_row.session_data
  ) on conflict (source_session_id) do update set source_session_id = excluded.source_session_id
  returning * into result;
  return result;
end;
$$;

create or replace function public.submit_pk_challenge_result(p_challenge_id uuid, p_session_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare challenge public.pk_challenges%rowtype; response public.completed_training_sessions%rowtype;
begin
  select * into challenge from public.pk_challenges where id = p_challenge_id for update;
  if not found then raise exception 'PK challenge does not exist'; end if;
  if challenge.opponent_id <> auth.uid() then raise exception 'Only the designated opponent can submit this PK result'; end if;
  if challenge.status = 'completed' then
    if challenge.opponent_session_id = p_session_id then return true; end if;
    raise exception 'PK challenge has already been completed';
  end if;
  select * into response from public.completed_training_sessions where session_id = p_session_id and owner_id = auth.uid();
  if not found then raise exception 'Synchronize your completed PK training before submitting it'; end if;
  if response.session_data ->> 'pkChallengeId' <> p_challenge_id::text then raise exception 'This training does not belong to the PK challenge'; end if;
  if response.session_data -> 'questions' <> challenge.frozen_session -> 'questions' then raise exception 'The frozen PK question set does not match'; end if;
  if response.question_type <> challenge.frozen_session ->> 'questionType'
     or response.subtype <> challenge.frozen_session ->> 'subtype'
     or response.question_count <> jsonb_array_length(challenge.frozen_session -> 'questions') then
    raise exception 'The PK training metadata does not match';
  end if;
  update public.pk_challenges set opponent_session_id = p_session_id, status = 'completed', completed_at = now()
    where id = p_challenge_id;
  return true;
end;
$$;

create or replace function public.unread_pk_result_ids()
returns table(challenge_id uuid) language sql stable security definer set search_path = public as $$
  select c.id from public.pk_challenges c
  where c.challenger_id = auth.uid() and c.status = 'completed'
    and not exists (select 1 from public.pk_result_receipts r where r.challenge_id = c.id and r.account_id = auth.uid());
$$;

create or replace function public.acknowledge_pk_results()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.pk_result_receipts (challenge_id, account_id)
  select c.id, auth.uid() from public.pk_challenges c
  where c.challenger_id = auth.uid() and c.status = 'completed'
  on conflict (challenge_id, account_id) do update set seen_at = excluded.seen_at;
end;
$$;

revoke all on function public.pair_opponent(uuid) from public;
revoke all on function public.create_pk_challenge(uuid) from public;
revoke all on function public.submit_pk_challenge_result(uuid, uuid) from public;
revoke all on function public.unread_pk_result_ids() from public;
revoke all on function public.acknowledge_pk_results() from public;
grant execute on function public.create_pk_challenge(uuid) to authenticated;
grant execute on function public.submit_pk_challenge_result(uuid, uuid) to authenticated;
grant execute on function public.unread_pk_result_ids() to authenticated;
grant execute on function public.acknowledge_pk_results() to authenticated;

select
  (select count(*) from public.pk_challenges) as pk_challenges,
  (select count(*) from public.pk_result_receipts) as pk_result_receipts;
