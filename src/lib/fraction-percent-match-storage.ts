import { FractionPercentMatchRecord } from "./fraction-percent-match";

const DB = "speed-math-fraction-match-v1";
const STORE = "records";

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Legacy migration rule: early v1 records are known to use the same 32-relation set. */
export function normalizeLegacyMatchRecord(value: unknown): FractionPercentMatchRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  const valid =
    typeof item.id === "string" &&
    (item.userId === "fish" || item.userId === "cat") &&
    typeof item.startedAt === "number" &&
    typeof item.completedAt === "number" &&
    typeof item.totalTimeMs === "number" &&
    item.relationCount === 32;
  if (!valid) return undefined;
  return {
    ...(item as unknown as FractionPercentMatchRecord),
    relationSetVersion: typeof item.relationSetVersion === "string" ? item.relationSetVersion : "1.0.0",
    gameVersion: typeof item.gameVersion === "string" ? item.gameVersion : "1.0.0",
    trainingSource: item.trainingSource === "pk" ? "pk" : "normal",
    pkChallengeId: typeof item.pkChallengeId === "string" ? item.pkChallengeId : undefined,
    syncStatus: item.syncStatus === "synced" || item.syncStatus === "syncing" || item.syncStatus === "failed" || item.syncStatus === "not_synced" ? item.syncStatus : "not_synced",
    syncedAt: typeof item.syncedAt === "number" ? item.syncedAt : undefined,
  };
}

export async function saveMatchRecord(record: FractionPercentMatchRecord) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function readMatchRecords(ownerAccountId?: string) {
  const db = await open();
  try {
    const rows = await new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return rows
      .map(normalizeLegacyMatchRecord)
      .filter((record): record is FractionPercentMatchRecord => Boolean(record))
      .filter((record) => record.ownerAccountId === ownerAccountId)
      .sort((left, right) => right.completedAt - left.completedAt);
  } finally {
    db.close();
  }
}
