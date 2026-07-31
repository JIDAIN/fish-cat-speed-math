import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  discardSession,
  readActive,
  readCompleted,
  saveSession,
} from "./storage";
import { generateQuestion } from "./generate";
import { GeneratedQuestion, TrainingSession } from "./types";

const DB = "speed-math-v1";
const STORE = "sessions";

function removeDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function session(
  id: string,
  overrides: Partial<TrainingSession> = {},
): TrainingSession {
  return {
    id,
    userId: "fish",
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: 10,
    questions: [],
    currentIndex: 0,
    records: [],
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 0,
    runningSince: null,
    pauseDurationMs: 0,
    status: "active",
    startedAt: 1,
    ...overrides,
  };
}

function putRaw(...sessions: TrainingSession[]) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE, "readwrite");
      sessions.forEach((saved) => transaction.objectStore(STORE).put(saved));
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

function readRawSessions(): Promise<TrainingSession[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE, "readonly");
      const getAll = transaction.objectStore(STORE).getAll();
      getAll.onsuccess = () => resolve(getAll.result as TrainingSession[]);
      getAll.onerror = () => reject(getAll.error);
      transaction.oncomplete = () => db.close();
    };
  });
}

beforeEach(removeDatabase);
afterEach(removeDatabase);

describe("IndexedDB training storage", () => {
  it("creates storage, saves an active session, and updates it without duplicating its id", async () => {
    await saveSession(session("active", { currentAnswer: "1" }));
    await saveSession(session("active", { currentAnswer: "12" }));

    expect(await readActive()).toMatchObject({
      id: "active",
      currentAnswer: "12",
    });
    expect(await readRawSessions()).toHaveLength(1);
  });

  it("keeps only the newest active session and can abandon it", async () => {
    await saveSession(session("first", { startedAt: 1 }));
    await saveSession(session("second", { startedAt: 2 }));

    expect((await readActive())?.id).toBe("second");
    await discardSession("second");
    expect(await readActive()).toBeUndefined();
  });

  it("recovers the most recently saved legacy active record and safely removes stale actives", async () => {
    const oldActive = session("old", { startedAt: 1, updatedAt: 10 });
    const latestActive = session("latest", {
      startedAt: 2,
      updatedAt: 20,
      currentRestartCount: 3,
    });
    const completed = session("completed", {
      status: "completed",
      startedAt: 3,
    });
    const legacy = session("legacy", {
      startedAt: 0,
    }) as Partial<TrainingSession>;
    delete legacy.currentRestartCount;
    await putRaw(oldActive, latestActive, completed, legacy as TrainingSession);

    expect(await readActive()).toMatchObject({
      id: "latest",
      currentRestartCount: 3,
    });
    await discardSession("latest");
    expect(await readActive()).toBeUndefined();
    expect(await readCompleted()).toHaveLength(1);
  });

  it("keeps completed sessions in history and excludes active sessions", async () => {
    await saveSession(session("active"));
    await saveSession(session("completed", { status: "completed" }));

    expect((await readCompleted()).map((saved) => saved.id)).toEqual([
      "completed",
    ]);
  });

  it("reads completed history in reverse completion order and excludes active and abandoned sessions", async () => {
    await putRaw(
      session("active", { startedAt: 400 }),
      session("abandoned", { status: "abandoned", startedAt: 300 }),
      session("older-completed", { status: "completed", startedAt: 100 }),
      session("newer-completed", { status: "completed", startedAt: 200 }),
    );

    expect((await readCompleted()).map((saved) => saved.id)).toEqual([
      "newer-completed",
      "older-completed",
    ]);
  });

  it("deletes an abandoned active session without deleting completed history", async () => {
    await saveSession(session("active"));
    await saveSession(session("completed", { status: "completed" }));

    await discardSession("active");

    expect(await readActive()).toBeUndefined();
    expect((await readCompleted()).map((saved) => saved.id)).toEqual([
      "completed",
    ]);
  });

  it("keeps the latest of legacy duplicate active records and safely removes every stale active", async () => {
    await putRaw(
      session("oldest", { startedAt: 1, updatedAt: 10 }),
      session("middle", { startedAt: 2, updatedAt: 20 }),
      session("latest", { startedAt: 3, updatedAt: 30 }),
      session("completed", { status: "completed", startedAt: 4 }),
    );

    expect((await readActive())?.id).toBe("latest");
    expect(
      (await readRawSessions())
        .filter((saved) => saved.status === "active")
        .map((saved) => saved.id),
    ).toEqual(["latest"]);
    expect((await readCompleted()).map((saved) => saved.id)).toEqual([
      "completed",
    ]);
  });

  it("can read older records that do not contain newly added fields", async () => {
    const legacyQuestion = {
      ...generateQuestion("two_digit_add_subtract"),
    } as Partial<GeneratedQuestion>;
    delete legacyQuestion.primaryStructure;
    delete legacyQuestion.secondaryTags;

    const legacy = session("legacy", {
      questions: [legacyQuestion as GeneratedQuestion],
    }) as Partial<TrainingSession>;
    delete legacy.currentRestartCount;
    delete legacy.pauseDurationMs;
    delete legacy.updatedAt;
    delete legacy.status;
    await putRaw(legacy as TrainingSession);

    expect(await readActive()).toMatchObject({
      id: "legacy",
      currentAnswer: "",
      currentRestartCount: 0,
      pauseDurationMs: 0,
      status: "active",
    });
    expect((await readActive())?.questions[0]).toMatchObject({
      primaryStructure: "legacy_unknown",
      secondaryTags: [],
    });
  });

  it("keeps legacy 10, 20 and 50-question counts while rejecting an invalid active count", async () => {
    await putRaw(
      session("ten", { questionCount: 10, updatedAt: 1 }),
      session("twenty", { questionCount: 20, updatedAt: 2 }),
      session("fifty", { questionCount: 50, updatedAt: 3 }),
      session("invalid", { questionCount: 15, updatedAt: 99 }),
    );

    expect((await readActive())?.id).toBe("fifty");
    expect((await readActive())?.questionCount).toBe(50);
  });

  it("surfaces IndexedDB open failures instead of silently returning empty data", async () => {
    const originalFactory = globalThis.indexedDB;
    vi.stubGlobal("indexedDB", {
      open() {
        throw new DOMException("IndexedDB is unavailable", "InvalidStateError");
      },
    } as unknown as IDBFactory);

    await expect(readActive()).rejects.toThrow("IndexedDB is unavailable");

    vi.unstubAllGlobals();
    expect(globalThis.indexedDB).toBe(originalFactory);
  });
});
