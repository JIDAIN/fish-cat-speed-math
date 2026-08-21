-- Independent lightweight history for the fraction-percent matching game.
create table if not exists public.fraction_percent_match_records (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_role public.member_role not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  total_time_ms bigint not null check (total_time_ms >= 0),
  relation_count integer not null check (relation_count = 32),
  relation_set_version text not null,
  game_version text not null,
  created_at timestamptz not null default now()
);
create index if not exists fraction_percent_match_owner_completed_idx on public.fraction_percent_match_records (owner_id, completed_at desc);
alter table public.fraction_percent_match_records enable row level security;

drop policy if exists "read paired fraction percent match records" on public.fraction_percent_match_records;
create policy "read paired fraction percent match records" on public.fraction_percent_match_records for select to authenticated using (
  owner_id = auth.uid() or exists (select 1 from public.pairs p where (p.fish_id = auth.uid() and p.cat_id = owner_id) or (p.cat_id = auth.uid() and p.fish_id = owner_id))
);

create or replace function public.sync_fraction_percent_match_record(
  p_record_id uuid, p_started_at timestamptz, p_completed_at timestamptz,
  p_total_time_ms bigint, p_relation_count integer, p_relation_set_version text, p_game_version text
) returns boolean language plpgsql security definer set search_path = public as $$
declare current_profile public.profiles%rowtype; existing_owner uuid;
begin
  select * into current_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Account is not an assigned pair member'; end if;
  if p_completed_at < p_started_at or p_total_time_ms < 0 or p_relation_count <> 32 then raise exception 'Invalid match record'; end if;
  select owner_id into existing_owner from public.fraction_percent_match_records where id = p_record_id;
  if found then
    if existing_owner <> auth.uid() then raise exception 'Record belongs to another account'; end if;
    return true;
  end if;
  insert into public.fraction_percent_match_records (id, owner_id, owner_role, started_at, completed_at, total_time_ms, relation_count, relation_set_version, game_version)
  values (p_record_id, auth.uid(), current_profile.role, p_started_at, p_completed_at, p_total_time_ms, p_relation_count, p_relation_set_version, p_game_version);
  return true;
end;
$$;
revoke all on function public.sync_fraction_percent_match_record(uuid, timestamptz, timestamptz, bigint, integer, text, text) from public;
grant execute on function public.sync_fraction_percent_match_record(uuid, timestamptz, timestamptz, bigint, integer, text, text) to authenticated;
