import { supabase } from "./cloud";
import { FractionPercentMatchRecord } from "./fraction-percent-match";

export type CloudMatchRow = {
  id: string;
  owner_id: string;
  owner_role: "fish" | "cat";
  started_at: string;
  completed_at: string;
  total_time_ms: number;
  relation_count: number;
  relation_set_version: string;
  game_version: string;
  training_source?: "normal" | "pk";
  pk_challenge_id?: string | null;
  blueprint_fingerprint?: string | null;
  created_at: string;
};

const columns =
  "id,owner_id,owner_role,started_at,completed_at,total_time_ms,relation_count,relation_set_version,game_version,training_source,pk_challenge_id,blueprint_fingerprint,created_at";

function map(row: CloudMatchRow): FractionPercentMatchRecord {
  return {
    id: row.id,
    userId: row.owner_role,
    ownerAccountId: row.owner_id,
    startedAt: new Date(row.started_at).getTime(),
    completedAt: new Date(row.completed_at).getTime(),
    totalTimeMs: row.total_time_ms,
    relationCount: 32,
    relationSetVersion: row.relation_set_version,
    gameVersion: row.game_version,
    syncStatus: "synced",
    trainingSource: row.training_source === "pk" ? "pk" : "normal",
    pkChallengeId: row.pk_challenge_id ?? undefined,
    blueprintFingerprint: row.blueprint_fingerprint ?? undefined,
  };
}

export async function syncMatchRecord(record: FractionPercentMatchRecord) {
  const db = supabase();
  if (!db || !record.ownerAccountId) return false;
  const { error } = await db.rpc("sync_fraction_percent_match_record", {
    p_record_id: record.id,
    p_started_at: new Date(record.startedAt).toISOString(),
    p_completed_at: new Date(record.completedAt).toISOString(),
    p_total_time_ms: record.totalTimeMs,
    p_relation_count: record.relationCount,
    p_relation_set_version: record.relationSetVersion,
    p_game_version: record.gameVersion,
    p_training_source: record.trainingSource ?? "normal",
    p_pk_challenge_id: record.pkChallengeId ?? null,
    p_blueprint_fingerprint: record.blueprintFingerprint ?? null,
  });
  if (error) throw error;
  return true;
}

export async function readMatchHistory(): Promise<
  FractionPercentMatchRecord[]
> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("fraction_percent_match_records")
    .select(columns)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CloudMatchRow[]).map(map);
}

export async function readOwnMatchRecordsForExport(
  identityId: string,
): Promise<CloudMatchRow[]> {
  const db = supabase();
  if (!db) throw new Error("Supabase is not configured");
  const { data, error } = await db
    .from("fraction_percent_match_records")
    .select(columns)
    .eq("owner_id", identityId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudMatchRow[];
}
export type MatchCloudCapability = "not_configured" | "ready" | "base_not_deployed" | "base_rpc_not_deployed" | "request_failed";
export async function checkFractionPercentMatchCloudCapability(): Promise<MatchCloudCapability> {
  const db = supabase(); if (!db) return "not_configured";
  const { data, error } = await db.rpc("fraction_percent_match_capabilities");
  if (error) {
    const table = await db.from("fraction_percent_match_records").select("id").limit(1);
    return table.error ? "base_not_deployed" : "base_rpc_not_deployed";
  }
  const capability = data as { history_available?: boolean } | null;
  return capability?.history_available ? "ready" : "base_not_deployed";
}

export type MatchSyncResult = { ok: true; record: FractionPercentMatchRecord } | { ok: false; reason: Exclude<MatchCloudCapability, "ready"> | "ownership" | "server" };
/** Shared no-UI sync primitive. It never changes local storage or component state. */
export async function syncOwnedMatchRecord(record: FractionPercentMatchRecord, identityId?: string): Promise<MatchSyncResult> {
  if (!identityId || record.ownerAccountId !== identityId) return { ok: false, reason: "ownership" };
  const capability = await checkFractionPercentMatchCloudCapability();
  if (capability !== "ready") return { ok: false, reason: capability };
  try {
    if (!(await syncMatchRecord(record))) return { ok: false, reason: "server" };
    return { ok: true, record: { ...record, syncStatus: "synced", syncedAt: Date.now() } };
  } catch { return { ok: false, reason: "server" }; }
}
