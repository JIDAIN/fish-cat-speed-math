-- Shared backend for JIDAIN/1000ci inside the existing fish-cat-speed-math Supabase project.
-- The two applications share Auth users and the physical Supabase project only.
-- 1000ci data is isolated behind ci_* tables/RPCs and paired-user RLS.

create table if not exists public.ci_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.ci_learning_states (
  user_id uuid primary key references public.ci_profiles(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null
);

alter table public.ci_profiles enable row level security;
alter table public.ci_learning_states enable row level security;

drop policy if exists "ci learners read paired profiles" on public.ci_profiles;
create policy "ci learners read paired profiles"
on public.ci_profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.pairs p
    where (p.fish_id = (select auth.uid()) and p.cat_id = ci_profiles.id)
       or (p.cat_id = (select auth.uid()) and p.fish_id = ci_profiles.id)
  )
);

drop policy if exists "ci learner creates own profile" on public.ci_profiles;
create policy "ci learner creates own profile"
on public.ci_profiles for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists "ci learner updates own profile" on public.ci_profiles;
create policy "ci learner updates own profile"
on public.ci_profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "ci learners read paired learning states" on public.ci_learning_states;
create policy "ci learners read paired learning states"
on public.ci_learning_states for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.pairs p
    where (p.fish_id = (select auth.uid()) and p.cat_id = ci_learning_states.user_id)
       or (p.cat_id = (select auth.uid()) and p.fish_id = ci_learning_states.user_id)
  )
);

drop policy if exists "ci learner writes own learning state" on public.ci_learning_states;
create policy "ci learner writes own learning state"
on public.ci_learning_states for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "ci learner updates own learning state" on public.ci_learning_states;
create policy "ci learner updates own learning state"
on public.ci_learning_states for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.ci_save_learning_state(
  incoming_state jsonb,
  incoming_updated_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  did_save boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if incoming_state->>'userId' is distinct from auth.uid()::text then
    raise exception 'Learning state user mismatch';
  end if;

  insert into public.ci_learning_states (user_id, state, updated_at)
  values (auth.uid(), incoming_state, incoming_updated_at)
  on conflict (user_id) do update
    set state = excluded.state,
        updated_at = excluded.updated_at
    where public.ci_learning_states.updated_at <= excluded.updated_at
  returning true into did_save;

  return coalesce(did_save, false);
end;
$$;

revoke all on table public.ci_profiles from anon;
revoke all on table public.ci_learning_states from anon;
grant select, insert, update on table public.ci_profiles to authenticated;
grant select, insert, update on table public.ci_learning_states to authenticated;
revoke all on function public.ci_save_learning_state(jsonb, timestamptz) from public;
grant execute on function public.ci_save_learning_state(jsonb, timestamptz) to authenticated;
