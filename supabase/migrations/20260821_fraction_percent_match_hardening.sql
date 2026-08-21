-- Non-destructive repair migration. Safe after neither, either, or both v1 migrations.
create table if not exists public.fraction_percent_match_records (
  id uuid primary key, owner_id uuid not null references public.profiles(id), owner_role public.member_role not null,
  started_at timestamptz not null, completed_at timestamptz not null, total_time_ms bigint not null,
  relation_count integer not null, relation_set_version text not null, game_version text not null, created_at timestamptz not null default now()
);
alter table public.fraction_percent_match_records add column if not exists training_source text not null default 'normal';
alter table public.fraction_percent_match_records add column if not exists pk_challenge_id uuid;
alter table public.fraction_percent_match_records add column if not exists blueprint_fingerprint text;
update public.fraction_percent_match_records set training_source = 'normal' where training_source is null;
alter table public.fraction_percent_match_records drop constraint if exists fraction_percent_match_records_training_source_check;
alter table public.fraction_percent_match_records add constraint fraction_percent_match_records_training_source_check check (training_source in ('normal','pk'));

create or replace function public.fraction_percent_match_capabilities()
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object('history_available', true, 'pk_available', to_regclass('public.fraction_percent_match_pk_challenges') is not null, 'record_schema_version', 2);
$$;
grant execute on function public.fraction_percent_match_capabilities() to authenticated;

-- Keep both signatures so old clients continue to sync as normal records.
create or replace function public.sync_fraction_percent_match_record(p_record_id uuid, p_started_at timestamptz, p_completed_at timestamptz, p_total_time_ms bigint, p_relation_count integer, p_relation_set_version text, p_game_version text, p_training_source text, p_pk_challenge_id uuid, p_blueprint_fingerprint text)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_profile public.profiles%rowtype; existing_owner uuid;
begin
 select * into current_profile from public.profiles where id=auth.uid(); if not found then raise exception 'Account is not assigned'; end if;
 if p_completed_at < p_started_at or p_total_time_ms < 0 or p_relation_count <> 32 or p_training_source not in ('normal','pk') then raise exception 'Invalid match record'; end if;
 select owner_id into existing_owner from public.fraction_percent_match_records where id=p_record_id;
 if found then if existing_owner <> auth.uid() then raise exception 'Record belongs to another account'; end if; return true; end if;
 insert into public.fraction_percent_match_records(id,owner_id,owner_role,started_at,completed_at,total_time_ms,relation_count,relation_set_version,game_version,training_source,pk_challenge_id,blueprint_fingerprint) values(p_record_id,auth.uid(),current_profile.role,p_started_at,p_completed_at,p_total_time_ms,p_relation_count,p_relation_set_version,p_game_version,p_training_source,p_pk_challenge_id,p_blueprint_fingerprint);
 return true;
end; $$;
create or replace function public.sync_fraction_percent_match_record(p_record_id uuid, p_started_at timestamptz, p_completed_at timestamptz, p_total_time_ms bigint, p_relation_count integer, p_relation_set_version text, p_game_version text)
returns boolean language sql security definer set search_path = public as $$ select public.sync_fraction_percent_match_record($1,$2,$3,$4,$5,$6,$7,'normal',null,null); $$;

create table if not exists public.fraction_percent_match_pk_challenges (
 id uuid primary key default gen_random_uuid(), challenger_id uuid not null references public.profiles(id), challenger_role public.member_role not null, opponent_id uuid not null references public.profiles(id), opponent_role public.member_role not null, challenger_record_id uuid not null unique references public.fraction_percent_match_records(id), opponent_record_id uuid unique references public.fraction_percent_match_records(id), frozen_layout jsonb not null, relation_set_version text not null, game_version text not null, status text not null default 'pending' check(status in ('pending','completed')), created_at timestamptz not null default now(), completed_at timestamptz, check(challenger_id <> opponent_id), check((status='completed')=(opponent_record_id is not null)));
alter table public.fraction_percent_match_pk_challenges add column if not exists blueprint_fingerprint text;
alter table public.fraction_percent_match_pk_challenges enable row level security;
drop policy if exists "read own fraction percent match pk" on public.fraction_percent_match_pk_challenges;
create policy "read own fraction percent match pk" on public.fraction_percent_match_pk_challenges for select to authenticated using(challenger_id=auth.uid() or opponent_id=auth.uid());
create index if not exists fraction_percent_match_pk_opponent_pending_idx on public.fraction_percent_match_pk_challenges(opponent_id,status,created_at desc);

create or replace function public.create_fraction_percent_match_pk_challenge(p_challenger_record_id uuid, p_frozen_layout jsonb, p_blueprint_fingerprint text) returns public.fraction_percent_match_pk_challenges language plpgsql security definer set search_path=public as $$
declare source public.fraction_percent_match_records%rowtype; opponent uuid; profile public.profiles%rowtype; result public.fraction_percent_match_pk_challenges%rowtype;
begin
 select * into source from public.fraction_percent_match_records where id=p_challenger_record_id and owner_id=auth.uid();
 if not found or source.training_source <> 'normal' or source.relation_count <> 32 or source.blueprint_fingerprint is null or source.blueprint_fingerprint <> p_blueprint_fingerprint then raise exception 'Only a matching synchronized normal record can start PK'; end if;
 if jsonb_typeof(p_frozen_layout) <> 'object' or jsonb_typeof(p_frozen_layout->'rounds') <> 'array' or jsonb_array_length(p_frozen_layout->'rounds') <> 4 or exists(select 1 from jsonb_array_elements(p_frozen_layout->'rounds') r where jsonb_typeof(r) <> 'array' or jsonb_array_length(r) <> 16) then raise exception 'Invalid frozen layout'; end if;
 opponent:=public.pair_opponent(auth.uid()); if opponent is null then raise exception 'No paired opponent'; end if; select * into profile from public.profiles where id=opponent;
 insert into public.fraction_percent_match_pk_challenges(challenger_id,challenger_role,opponent_id,opponent_role,challenger_record_id,frozen_layout,relation_set_version,game_version,blueprint_fingerprint) values(auth.uid(),source.owner_role,opponent,profile.role,source.id,p_frozen_layout,source.relation_set_version,source.game_version,p_blueprint_fingerprint) on conflict(challenger_record_id) do update set frozen_layout=excluded.frozen_layout returning * into result; return result;
end; $$;
-- The pre-hardening two-argument endpoint has no fingerprint and must not
-- remain a bypass for the bound-board protocol.
create or replace function public.create_fraction_percent_match_pk_challenge(p_challenger_record_id uuid, p_frozen_layout jsonb) returns public.fraction_percent_match_pk_challenges language plpgsql security definer set search_path=public as $$
begin raise exception 'Please update the application before creating a match PK challenge'; end; $$;
create or replace function public.submit_fraction_percent_match_pk_result(p_challenge_id uuid,p_record_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare challenge public.fraction_percent_match_pk_challenges%rowtype; response public.fraction_percent_match_records%rowtype;
begin
 select * into challenge from public.fraction_percent_match_pk_challenges where id=p_challenge_id for update; if not found then raise exception 'Challenge does not exist'; end if; if challenge.opponent_id <> auth.uid() then raise exception 'Only designated opponent can submit'; end if; if challenge.status='completed' then if challenge.opponent_record_id=p_record_id then return true; else raise exception 'Challenge completed'; end if; end if;
 select * into response from public.fraction_percent_match_records where id=p_record_id and owner_id=auth.uid(); if not found or response.training_source <> 'pk' or response.pk_challenge_id <> challenge.id or response.relation_count <> 32 or response.relation_set_version <> challenge.relation_set_version or response.game_version <> challenge.game_version or response.blueprint_fingerprint is distinct from challenge.blueprint_fingerprint then raise exception 'Result is not bound to this challenge'; end if;
 update public.fraction_percent_match_pk_challenges set opponent_record_id=p_record_id,status='completed',completed_at=now() where id=p_challenge_id; return true;
end; $$;
grant execute on function public.sync_fraction_percent_match_record(uuid,timestamptz,timestamptz,bigint,integer,text,text,text,uuid,text) to authenticated;
grant execute on function public.sync_fraction_percent_match_record(uuid,timestamptz,timestamptz,bigint,integer,text,text) to authenticated;
grant execute on function public.create_fraction_percent_match_pk_challenge(uuid,jsonb,text) to authenticated;
grant execute on function public.submit_fraction_percent_match_pk_result(uuid,uuid) to authenticated;
