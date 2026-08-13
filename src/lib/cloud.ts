import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TrainingSession } from "./types";
import { PKChallenge } from "./pk";

export type CloudIdentity = { id: string; role: "fish" | "cat"; email: string };

export type CloudCompletedTrainingRow = {
  session_id: string;
  owner_id: string;
  owner_role: "fish" | "cat";
  question_type: string;
  subtype: string;
  question_count: number;
  generator_version: string;
  grading_version: string;
  rating_version: string;
  schema_version: number;
  session_data: Record<string, unknown>;
  completed_at: string;
  real_completed_at?: string | null;
  created_at: string;
};

export type ExportReadProgress = { page: number; recordCount: number };
const EXPORT_PAGE_SIZE = 200;
const EXPORT_COLUMNS =
  "session_id,owner_id,owner_role,question_type,subtype,question_count,generator_version,grading_version,rating_version,schema_version,session_data,completed_at,created_at";
const EXPORT_COLUMNS_WITH_REAL_COMPLETED_AT =
  `${EXPORT_COLUMNS},real_completed_at`;

let client: SupabaseClient | undefined;

export function supabase(): SupabaseClient | undefined {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return undefined;
  client = createClient(url, key);
  return client;
}

export async function currentIdentity(): Promise<CloudIdentity | undefined> {
  const db = supabase();
  if (!db) return undefined;
  const { data } = await db.auth.getUser();
  if (!data.user) return undefined;
  const { data: profile, error } = await db
    .from("profiles")
    .select("role,email")
    .eq("id", data.user.id)
    .maybeSingle();
  if (error || !profile || (profile.role !== "fish" && profile.role !== "cat"))
    return undefined;
  return { id: data.user.id, role: profile.role, email: profile.email };
}

export async function signIn(email: string, password: string) {
  const db = supabase();
  if (!db) throw new Error("Supabase is not configured");
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const identity = await currentIdentity();
  if (!identity) throw new Error("This account is not assigned to fish or cat");
  return identity;
}

export async function signOut() {
  const db = supabase();
  if (db) await db.auth.signOut();
}

export async function syncCompleted(session: TrainingSession) {
  const db = supabase();
  if (!db || session.status !== "completed" || !session.ownerAccountId)
    return false;
  const { error } = await db.rpc("sync_completed_training_session", {
    p_session_id: session.id,
    // The cloud row itself proves the upload completed. Do not persist the
    // short-lived local "syncing" state in the frozen cloud payload.
    p_session_data: {
      ...session,
      syncStatus: "synced",
      syncedAt: session.syncedAt ?? Date.now(),
    },
    p_generator_version:
      session.questions[0]?.generationRuleVersion ?? "legacy_unknown",
    p_grading_version: "1.0.0",
    p_rating_version: session.rating?.version ?? "legacy_dynamic",
    p_schema_version: 1,
  });
  if (error) throw error;
  return true;
}

export async function readCloudHistory(): Promise<TrainingSession[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("completed_training_sessions")
    .select("session_data")
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row.session_data as TrainingSession),
    // Older uploads may have stored the in-flight UI state. A row returned by
    // this completed-only endpoint has already been accepted by Supabase.
    syncStatus: "synced" as const,
  }));
}

/** Reads every cloud-completed session belonging to the authenticated owner only. */
export async function readOwnCompletedTrainingForExport(
  identityId: string,
  onProgress?: (progress: ExportReadProgress) => void,
): Promise<CloudCompletedTrainingRow[]> {
  const db = supabase();
  if (!db) throw new Error("Supabase is not configured");

  const rows: CloudCompletedTrainingRow[] = [];
  let includeRealCompletedAt = true;
  for (let page = 0; ; page += 1) {
    const from = page * EXPORT_PAGE_SIZE;
    const to = from + EXPORT_PAGE_SIZE - 1;
    const { data, error } = await db
      .from("completed_training_sessions")
      .select(
        includeRealCompletedAt
          ? EXPORT_COLUMNS_WITH_REAL_COMPLETED_AT
          : EXPORT_COLUMNS,
      )
      .eq("owner_id", identityId)
      .order(includeRealCompletedAt ? "real_completed_at" : "completed_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("session_id", { ascending: false })
      .range(from, to);
    // The application can be deployed before its Supabase migration. Retry
    // from page one using the long-standing columns; completedAt remains in
    // session_data and is still exported when the new DB column is absent.
    if (
      error &&
      includeRealCompletedAt &&
      /real_completed_at/i.test(error.message ?? "")
    ) {
      includeRealCompletedAt = false;
      rows.length = 0;
      page = -1;
      continue;
    }
    if (error) throw error;
    const pageRows = (data ?? []) as unknown as CloudCompletedTrainingRow[];
    rows.push(...pageRows);
    onProgress?.({ page: page + 1, recordCount: rows.length });
    if (pageRows.length < EXPORT_PAGE_SIZE) return rows;
  }
}

type CloudPKRow = {
  id: string;
  challenger_id: string;
  challenger_role: "fish" | "cat";
  opponent_id: string;
  opponent_role: "fish" | "cat";
  source_session_id: string;
  frozen_session: TrainingSession;
  opponent_session_id: string | null;
  status: "pending" | "completed";
  created_at: string;
  completed_at: string | null;
};

function mapChallenge(row: CloudPKRow): PKChallenge {
  return {
    id: row.id,
    challengerId: row.challenger_id,
    challengerRole: row.challenger_role,
    opponentId: row.opponent_id,
    opponentRole: row.opponent_role,
    sourceSessionId: row.source_session_id,
    frozenSession: row.frozen_session,
    opponentSessionId: row.opponent_session_id ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    completedAt: row.completed_at
      ? new Date(row.completed_at).getTime()
      : undefined,
    status: row.status,
  };
}

export async function readPKChallenges(): Promise<PKChallenge[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db
    .from("pk_challenges")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as CloudPKRow[] | null) ?? []).map(mapChallenge);
}

export async function createPKChallenge(sourceSessionId: string) {
  const db = supabase();
  if (!db) throw new Error("Supabase is not configured");
  const { data, error } = await db.rpc("create_pk_challenge", {
    p_source_session_id: sourceSessionId,
  });
  if (error) throw error;
  return mapChallenge(data as CloudPKRow);
}

export async function submitPKResult(challengeId: string, sessionId: string) {
  const db = supabase();
  if (!db) throw new Error("Supabase is not configured");
  const { error } = await db.rpc("submit_pk_challenge_result", {
    p_challenge_id: challengeId,
    p_session_id: sessionId,
  });
  if (error) throw error;
}

/** Marks result notifications read for this account without altering challenges. */
export async function acknowledgePKResults() {
  const db = supabase();
  if (!db) return;
  const { error } = await db.rpc("acknowledge_pk_results");
  if (error) throw error;
}

export async function unreadPKResultIds(): Promise<string[]> {
  const db = supabase();
  if (!db) return [];
  const { data, error } = await db.rpc("unread_pk_result_ids");
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((row) =>
    typeof row === "string"
      ? row
      : (row as { challenge_id: string }).challenge_id,
  );
}
