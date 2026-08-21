-- Independent PK challenges for frozen fraction-percent match boards.
create table public.fraction_percent_match_pk_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id), challenger_role public.member_role not null,
  opponent_id uuid not null references public.profiles(id), opponent_role public.member_role not null,
  challenger_record_id uuid not null unique references public.fraction_percent_match_records(id),
  opponent_record_id uuid unique references public.fraction_percent_match_records(id),
  frozen_layout jsonb not null, relation_set_version text not null, game_version text not null,
  status text not null default 'pending' check (status in ('pending','completed')),
  created_at timestamptz not null default now(), completed_at timestamptz,
  check (challenger_id <> opponent_id), check ((status = 'completed') = (opponent_record_id is not null))
);
create index fraction_percent_match_pk_opponent_pending_idx on public.fraction_percent_match_pk_challenges(opponent_id, status, created_at desc);
alter table public.fraction_percent_match_pk_challenges enable row level security;
create policy "read own fraction percent match pk" on public.fraction_percent_match_pk_challenges for select to authenticated using (challenger_id = auth.uid() or opponent_id = auth.uid());

create function public.create_fraction_percent_match_pk_challenge(p_challenger_record_id uuid, p_frozen_layout jsonb)
returns public.fraction_percent_match_pk_challenges language plpgsql security definer set search_path = public as $$
declare source public.fraction_percent_match_records%rowtype; opponent uuid; profile public.profiles%rowtype; result public.fraction_percent_match_pk_challenges%rowtype;
begin
 select * into source from public.fraction_percent_match_records where id = p_challenger_record_id and owner_id = auth.uid(); if not found then raise exception 'Only your synchronized completed match record can start PK'; end if;
 opponent := public.pair_opponent(auth.uid()); if opponent is null then raise exception 'No paired opponent'; end if; select * into profile from public.profiles where id = opponent;
 insert into public.fraction_percent_match_pk_challenges(challenger_id, challenger_role, opponent_id, opponent_role, challenger_record_id, frozen_layout, relation_set_version, game_version)
 values(auth.uid(), source.owner_role, opponent, profile.role, source.id, p_frozen_layout, source.relation_set_version, source.game_version)
 on conflict(challenger_record_id) do update set challenger_record_id = excluded.challenger_record_id returning * into result; return result;
end; $$;
create function public.submit_fraction_percent_match_pk_result(p_challenge_id uuid, p_record_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare challenge public.fraction_percent_match_pk_challenges%rowtype; response public.fraction_percent_match_records%rowtype;
begin
 select * into challenge from public.fraction_percent_match_pk_challenges where id = p_challenge_id for update; if not found then raise exception 'Challenge does not exist'; end if;
 if challenge.opponent_id <> auth.uid() then raise exception 'Only designated opponent can submit'; end if;
 if challenge.status = 'completed' then if challenge.opponent_record_id = p_record_id then return true; else raise exception 'Challenge completed'; end if; end if;
 select * into response from public.fraction_percent_match_records where id = p_record_id and owner_id = auth.uid(); if not found then raise exception 'Only your synchronized result can submit'; end if;
 update public.fraction_percent_match_pk_challenges set opponent_record_id = p_record_id, status = 'completed', completed_at = now() where id = p_challenge_id; return true;
end; $$;
revoke all on function public.create_fraction_percent_match_pk_challenge(uuid, jsonb) from public;
revoke all on function public.submit_fraction_percent_match_pk_result(uuid, uuid) from public;
grant execute on function public.create_fraction_percent_match_pk_challenge(uuid, jsonb) to authenticated;
grant execute on function public.submit_fraction_percent_match_pk_result(uuid, uuid) to authenticated;
