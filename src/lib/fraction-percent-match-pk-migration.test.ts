import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260821_fraction_percent_match_hardening.sql"), "utf8");
describe("match PK hardening migration static guards", () => {
  it("binds PK records to the selected challenge, owner, versions, and fingerprint", () => {
    ["response.training_source <> 'pk'", "response.pk_challenge_id <> challenge.id", "response.relation_count <> 32", "response.relation_set_version <> challenge.relation_set_version", "response.game_version <> challenge.game_version", "response.blueprint_fingerprint is distinct from challenge.blueprint_fingerprint"].forEach((guard) => expect(migration).toContain(guard));
  });
  it("keeps repeated same-result submission idempotent and rejects another result", () => {
    expect(migration).toContain("if challenge.opponent_record_id=p_record_id then return true; else raise exception 'Challenge completed'");
    expect(migration).toContain("on conflict(challenger_record_id)");
  });
  it("requires a normal source record and a structurally valid four-round frozen board", () => {
    expect(migration).toContain("source.training_source <> 'normal'");
    expect(migration).toContain("jsonb_array_length(p_frozen_layout->'rounds') <> 4");
    expect(migration).toContain("jsonb_array_length(r) <> 16");
  });
});
