-- Shared-backend security hardening for fish-cat-speed-math + 1000ci.
-- Keep application behavior unchanged while removing anonymous/public access.

-- 1. Cloud features require an authenticated session. RLS already protects rows,
-- but legacy grants still exposed every table operation to anon.
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.pairs from anon;
revoke all privileges on table public.completed_training_sessions from anon;
revoke all privileges on table public.pk_challenges from anon;
revoke all privileges on table public.pk_result_receipts from anon;
revoke all privileges on table public.fraction_percent_match_records from anon;
revoke all privileges on table public.fraction_percent_match_pk_challenges from anon;
revoke all privileges on table public.ci_profiles from anon;
revoke all privileges on table public.ci_learning_states from anon;

-- 2. PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Reset the
-- exposed public schema to opt-in RPC access, then grant only application entrypoints.
revoke execute on all functions in schema public from public, anon, authenticated;

-- These functions do not require elevated table privileges and should obey the
-- caller's RLS/role rather than run as postgres.
alter function public.fraction_percent_match_capabilities() security invoker;
alter function public.unread_pk_result_ids() security invoker;
alter function public.sync_fraction_percent_match_record(
  uuid, timestamptz, timestamptz, bigint, integer, text, text
) security invoker;
alter function public.create_fraction_percent_match_pk_challenge(
  uuid, jsonb
) security invoker;

-- 3. Browser-facing RPCs. Core write RPCs intentionally remain SECURITY DEFINER:
-- their bodies bind every mutation to auth.uid(), profile membership and/or the
-- designated PK opponent, and the underlying tables intentionally expose no
-- direct write policy.
grant execute on function public.ci_save_learning_state(jsonb, timestamptz) to authenticated, service_role;
grant execute on function public.sync_completed_training_session(uuid, jsonb, text, text, text, integer) to authenticated, service_role;
grant execute on function public.create_pk_challenge(uuid) to authenticated, service_role;
grant execute on function public.submit_pk_challenge_result(uuid, uuid) to authenticated, service_role;
grant execute on function public.acknowledge_pk_results() to authenticated, service_role;
grant execute on function public.unread_pk_result_ids() to authenticated, service_role;
grant execute on function public.fraction_percent_match_capabilities() to authenticated, service_role;
grant execute on function public.sync_fraction_percent_match_record(uuid, timestamptz, timestamptz, bigint, integer, text, text) to authenticated, service_role;
grant execute on function public.sync_fraction_percent_match_record(uuid, timestamptz, timestamptz, bigint, integer, text, text, text, uuid, text) to authenticated, service_role;
grant execute on function public.create_fraction_percent_match_pk_challenge(uuid, jsonb) to authenticated, service_role;
grant execute on function public.create_fraction_percent_match_pk_challenge(uuid, jsonb, text) to authenticated, service_role;
grant execute on function public.submit_fraction_percent_match_pk_result(uuid, uuid) to authenticated, service_role;

-- Internal trigger/helper functions deliberately receive no authenticated/anon grant:
-- assign_fixed_profile(), link_fixed_pair_after_profile(), ensure_fixed_pair(),
-- pair_opponent(uuid). Triggers and postgres-owned SECURITY DEFINER functions can
-- continue using them internally without making them public RPC endpoints.

-- 4. Make future functions secure by default. New browser RPCs must be explicitly
-- granted in the migration that creates them.
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
alter default privileges for role postgres in schema public revoke execute on functions from authenticated;
