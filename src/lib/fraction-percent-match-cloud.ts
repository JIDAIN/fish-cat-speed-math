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
  created_at: string;
};

const columns =
  "id,owner_id,owner_role,started_at,completed_at,total_time_ms,relation_count,relation_set_version,game_version,created_at";

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
