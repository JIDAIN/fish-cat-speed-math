import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { TrainingSession } from "./types";

export type CloudIdentity = { id: string; role: "fish" | "cat"; email: string };

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
    p_rating_version: "1.0.0",
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
