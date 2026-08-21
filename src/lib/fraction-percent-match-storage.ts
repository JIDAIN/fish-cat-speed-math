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

function valid(value: unknown): value is FractionPercentMatchRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (item.userId === "fish" || item.userId === "cat") &&
    typeof item.startedAt === "number" &&
    typeof item.completedAt === "number" &&
    typeof item.totalTimeMs === "number" &&
    item.relationCount === 32 &&
    typeof item.relationSetVersion === "string" &&
    typeof item.gameVersion === "string"
  );
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
      .filter(valid)
      .filter((record) => record.ownerAccountId === ownerAccountId)
      .sort((left, right) => right.completedAt - left.completedAt);
  } finally {
    db.close();
  }
}
