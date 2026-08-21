import { supabase } from "./cloud";
import { MatchGameBlueprint, matchBlueprintFingerprint, validateMatchBlueprint } from "./fraction-percent-match";
import { FractionPercentMatchPKChallenge } from "./fraction-percent-match-pk";
type Row = {
  id: string;
  challenger_id: string;
  challenger_role: "fish" | "cat";
  opponent_id: string;
  opponent_role: "fish" | "cat";
  challenger_record_id: string;
  opponent_record_id: string | null;
  frozen_layout: MatchGameBlueprint;
  relation_set_version: string;
  game_version: string;
  blueprint_fingerprint: string;
  status: "pending" | "completed";
  created_at: string;
  completed_at: string | null;
};
const map = (row: Row): FractionPercentMatchPKChallenge => ({
  id: row.id,
  challengerId: row.challenger_id,
  challengerRole: row.challenger_role,
  opponentId: row.opponent_id,
  opponentRole: row.opponent_role,
  challengerRecordId: row.challenger_record_id,
  opponentRecordId: row.opponent_record_id ?? undefined,
  blueprint: row.frozen_layout,
  relationSetVersion: row.relation_set_version,
  gameVersion: row.game_version,
  blueprintFingerprint: row.blueprint_fingerprint,
  status: row.status,
  createdAt: new Date(row.created_at).getTime(),
  completedAt: row.completed_at
    ? new Date(row.completed_at).getTime()
    : undefined,
});
export async function readMatchPKChallenges() {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("fraction_percent_match_pk_challenges")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(map);
}
export async function createMatchPKChallenge(
  recordId: string,
  blueprint: MatchGameBlueprint,
) {
  const db = supabase();
  if (!db) throw new Error("Supabase is not configured");
  if (!validateMatchBlueprint(blueprint)) throw new Error("Invalid frozen match board");
  const { data, error } = await db.rpc(
    "create_fraction_percent_match_pk_challenge",
    { p_challenger_record_id: recordId, p_frozen_layout: blueprint, p_blueprint_fingerprint: matchBlueprintFingerprint(blueprint) },
  );
  if (error) throw error;
  return map(data as Row);
}
export async function submitMatchPKResult(
  challengeId: string,
  recordId: string,
) {
  const db = supabase();
  if (!db) throw new Error("Supabase is not configured");
  const { error } = await db.rpc("submit_fraction_percent_match_pk_result", {
    p_challenge_id: challengeId,
    p_record_id: recordId,
  });
  if (error) throw error;
}
