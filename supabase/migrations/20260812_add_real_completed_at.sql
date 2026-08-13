-- Adds the real client completion timestamp for newly synchronized sessions.
-- Existing rows are intentionally not backfilled: their legacy completed_at
-- column was populated from startedAt and must not be presented as completion.

alter table public.completed_training_sessions
  add column if not exists real_completed_at timestamptz;

create index if not exists completed_training_sessions_owner_real_completed_idx
  on public.completed_training_sessions (owner_id, real_completed_at desc);

create or replace function public.sync_completed_training_session(
  p_session_id uuid,
  p_session_data jsonb,
  p_generator_version text,
  p_grading_version text,
  p_rating_version text,
  p_schema_version integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  existing_owner uuid;
  real_completed_at_value timestamptz;
begin
  select * into current_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Account is not an assigned pair member'; end if;
  if p_session_data ->> 'id' <> p_session_id::text
     or p_session_data ->> 'status' <> 'completed' then
    raise exception 'Only frozen completed sessions can be synchronized';
  end if;

  if jsonb_typeof(p_session_data -> 'completedAt') = 'number'
     and (p_session_data ->> 'completedAt')::double precision >= 0 then
    real_completed_at_value := to_timestamp(
      (p_session_data ->> 'completedAt')::double precision / 1000
    );
  end if;

  select owner_id into existing_owner
    from public.completed_training_sessions where session_id = p_session_id;
  if found then
    if existing_owner <> auth.uid() then raise exception 'Session belongs to another account'; end if;
    return true;
  end if;

  insert into public.completed_training_sessions (
    session_id, owner_id, owner_role, question_type, subtype, question_count,
    generator_version, grading_version, rating_version, schema_version,
    session_data, completed_at, real_completed_at
  ) values (
    p_session_id, auth.uid(), current_profile.role,
    p_session_data ->> 'questionType', p_session_data ->> 'subtype',
    coalesce((p_session_data ->> 'questionCount')::integer,
             jsonb_array_length(p_session_data -> 'questions')),
    p_generator_version, p_grading_version, p_rating_version, p_schema_version,
    p_session_data,
    -- Legacy column is retained for compatibility only. It stores startedAt.
    to_timestamp((p_session_data ->> 'startedAt')::double precision / 1000),
    real_completed_at_value
  );
  return true;
end;
$$;
