-- 1000ci shares Auth with fish-cat-speed-math. Only the two fixed speed-math
-- pair members may create/update a 1000ci profile; arbitrary authenticated
-- accounts must not be able to consume the shared backend.

drop policy if exists "ci learner creates own profile" on public.ci_profiles;
create policy "ci fixed learner creates own profile"
on public.ci_profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
  )
);

drop policy if exists "ci learner updates own profile" on public.ci_profiles;
create policy "ci fixed learner updates own profile"
on public.ci_profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
  )
)
with check (
  id = (select auth.uid())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
  )
);
