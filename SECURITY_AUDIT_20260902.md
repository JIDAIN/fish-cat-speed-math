# Shared Supabase security audit — 2026-09-02

Scope: the `fish-cat-speed-math` Supabase project after it became the shared backend for both speed-math and 1000ci.

## Fixed

- Removed all `anon` DML privileges from every application table in `public`.
- Removed PostgreSQL's inherited `PUBLIC EXECUTE` access from all public RPCs.
- Restricted browser-facing RPC execution to `authenticated` (and `service_role` for administrative compatibility).
- Removed external execution from trigger/internal helpers:
  - `assign_fixed_profile()`
  - `link_fixed_pair_after_profile()`
  - `ensure_fixed_pair()`
  - `pair_opponent(uuid)`
- Converted RPCs that do not need privileged writes to `SECURITY INVOKER`:
  - `fraction_percent_match_capabilities()`
  - `unread_pk_result_ids()`
  - legacy 7-argument `sync_fraction_percent_match_record(...)` wrapper
  - deprecated 2-argument `create_fraction_percent_match_pk_challenge(...)` compatibility endpoint
- Changed default privileges so future functions are not executable by `PUBLIC`, `anon`, or `authenticated` unless a migration explicitly grants access.
- Restricted 1000ci profile creation/update to authenticated users who also exist in the fixed speed-math `profiles` pair.

## Intentionally retained SECURITY DEFINER RPCs

The following are authenticated application write boundaries and intentionally remain `SECURITY DEFINER` because their underlying tables do not expose direct write policies. Their function bodies bind mutations to `auth.uid()`, fixed profile membership, source-record ownership and/or the designated PK opponent:

- `sync_completed_training_session(...)`
- `create_pk_challenge(uuid)`
- `submit_pk_challenge_result(uuid, uuid)`
- `acknowledge_pk_results()`
- `sync_fraction_percent_match_record(...)` (current 10-argument endpoint)
- `create_fraction_percent_match_pk_challenge(uuid, jsonb, text)`
- `submit_fraction_percent_match_pk_result(uuid, uuid)`

Supabase Security Advisor therefore continues to report the generic `authenticated_security_definer_function_executable` warning for these intentional endpoints. Do not silence those warnings by granting direct table writes unless the data-integrity model is redesigned and tested.

## Auth status

At audit time the project contained exactly two Auth users and both were assigned fixed fish/cat profiles; there were no unassigned Auth users.

Supabase's leaked-password protection remains unavailable on the Free plan. It can only be enabled on Pro or above. This is a platform-plan limitation, not a database permission defect.

## Verification performed

- Application-table row counts were captured before and after hardening and were unchanged.
- All application tables retain RLS.
- `anon` has no SELECT/INSERT/UPDATE/DELETE privilege on application tables after hardening.
- `anon` has no EXECUTE privilege on public application RPCs after hardening.
- A simulated authenticated fixed-user session successfully invoked `fraction_percent_match_capabilities()` and `unread_pk_result_ids()` and retained RLS-scoped access to training history and 1000ci profiles.
- Source scan found no `service_role` or `SUPABASE_SERVICE` credential use in the client repository; `.env.example` contains only the public URL and publishable key.
