import {
  GeneratedQuestion,
  QuestionRecord,
  questionTypes,
  QuestionType,
  Subtype,
  TrainingSession,
} from "./types";
import { isValidQuestionCount } from "./question-count";
const DB = "speed-math-v1",
  STORE = "sessions";

const subtypes: readonly Subtype[] = [
  "standard",
  "quotient_first",
  "quotient_two",
  "percent_to_fraction",
  "fraction_to_percent",
  "comparison",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeQuestion(value: unknown): GeneratedQuestion | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" ||
    !questionTypes.includes(value.type as QuestionType) ||
    !subtypes.includes(value.subtype as Subtype) ||
    typeof value.prompt !== "string" ||
    typeof value.answer !== "string"
  )
    return undefined;

  const difficulty = isRecord(value.difficulty) ? value.difficulty : undefined;
  const level = difficulty?.level;
  const difficultyLevel =
    level === 1 || level === 2 || level === 3 || level === 4 || level === 5
      ? level
      : 1;
  const data = isRecord(value.data) ? value.data : {};
  const acceptedRange = isRecord(value.acceptedRange)
    ? value.acceptedRange
    : undefined;

  return {
    id: value.id,
    type: value.type as QuestionType,
    subtype: value.subtype as Subtype,
    prompt: value.prompt,
    answer: value.answer,
    data: data as GeneratedQuestion["data"],
    difficulty: {
      level: difficultyLevel,
      tags: normalizeStringArray(difficulty?.tags),
    },
    primaryStructure:
      typeof value.primaryStructure === "string"
        ? value.primaryStructure
        : "legacy_unknown",
    secondaryTags: normalizeStringArray(value.secondaryTags),
    generationRuleVersion:
      typeof value.generationRuleVersion === "string"
        ? value.generationRuleVersion
        : "legacy_unknown",
    acceptedRange:
      typeof acceptedRange?.min === "number" &&
      typeof acceptedRange.max === "number"
        ? { min: acceptedRange.min, max: acceptedRange.max }
        : undefined,
  };
}

function normalizeRecord(value: unknown): QuestionRecord | undefined {
  if (!isRecord(value)) return undefined;
  const question = normalizeQuestion(value.question);
  if (!question) return undefined;
  if (
    typeof value.userAnswer !== "string" ||
    typeof value.isCorrect !== "boolean" ||
    typeof value.timeUsedMs !== "number"
  )
    return undefined;

  const accuracyLevel =
    value.accuracyLevel === "exact" ||
    value.accuracyLevel === "accepted" ||
    value.accuracyLevel === "wrong"
      ? value.accuracyLevel
      : value.isCorrect
        ? "exact"
        : "wrong";

  return {
    question,
    userAnswer: value.userAnswer,
    isCorrect: value.isCorrect,
    accuracyLevel,
    timeUsedMs: value.timeUsedMs,
    restartCount:
      typeof value.restartCount === "number" ? value.restartCount : 0,
    usedScratchpad:
      typeof value.usedScratchpad === "boolean" ? value.usedScratchpad : false,
  };
}

/**
 * IndexedDB has no schema validation. Normalize only release-added fields at
 * the storage boundary so older sessions remain usable by typed UI code.
 */
function normalizeSession(value: unknown): TrainingSession | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" ||
    typeof value.userId !== "string" ||
    !questionTypes.includes(value.questionType as QuestionType) ||
    !subtypes.includes(value.subtype as Subtype) ||
    !Array.isArray(value.questions) ||
    typeof value.currentIndex !== "number" ||
    typeof value.currentAnswer !== "string" ||
    typeof value.accumulatedMs !== "number" ||
    (typeof value.runningSince !== "number" && value.runningSince !== null) ||
    typeof value.startedAt !== "number"
  )
    return undefined;

  const questions = value.questions
    .map(normalizeQuestion)
    .filter((question): question is GeneratedQuestion => Boolean(question));
  if (questions.length !== value.questions.length) return undefined;

  const records = Array.isArray(value.records)
    ? value.records
        .map(normalizeRecord)
        .filter((record): record is QuestionRecord => Boolean(record))
    : [];
  const status =
    value.status === "active" ||
    value.status === "completed" ||
    value.status === "abandoned"
      ? value.status
      : questions.length > 0 && records.length === questions.length
        ? "completed"
        : "active";

  // Earlier releases did not persist questionCount. Use the frozen question
  // set length rather than reinterpreting an old record with new UI rules.
  const savedQuestionCount = value.questionCount;
  const questionCount =
    typeof savedQuestionCount === "number" &&
    Number.isInteger(savedQuestionCount) &&
    savedQuestionCount > 0
      ? savedQuestionCount
      : questions.length;

  // A newly persisted active session must use the shared 10–100 contract and
  // agree with its frozen set. Legacy active records without this field still
  // remain recoverable through the length fallback above.
  if (
    status === "active" &&
    savedQuestionCount !== undefined &&
    !isValidQuestionCount(questionCount)
  )
    return undefined;

  return {
    id: value.id,
    userId: value.userId,
    questionType: value.questionType as QuestionType,
    subtype: value.subtype as Subtype,
    questionCount,
    questions,
    currentIndex: value.currentIndex,
    records,
    currentAnswer: value.currentAnswer,
    currentRestartCount:
      typeof value.currentRestartCount === "number"
        ? value.currentRestartCount
        : 0,
    accumulatedMs: value.accumulatedMs,
    runningSince: value.runningSince,
    pauseDurationMs:
      typeof value.pauseDurationMs === "number" ? value.pauseDurationMs : 0,
    status,
    startedAt: value.startedAt,
    updatedAt:
      typeof value.updatedAt === "number" ? value.updatedAt : undefined,
  };
}

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readAllSessions(): Promise<TrainingSession[]> {
  const db = await open();
  try {
    const all = await new Promise<unknown[]>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return all
      .map(normalizeSession)
      .filter((session): session is TrainingSession => Boolean(session));
  } finally {
    db.close();
  }
}
export async function saveSession(session: TrainingSession) {
  const db = await open();
  const sessionToSave =
    session.status === "active"
      ? { ...session, updatedAt: Date.now() }
      : session;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    // A browser can only resume one exercise. Remove stale active records in
    // the same transaction before saving the current one.
    if (sessionToSave.status === "active") {
      const activeRequest = store.getAll();
      activeRequest.onsuccess = () => {
        (activeRequest.result as TrainingSession[])
          .filter(
            (saved) =>
              saved.status === "active" && saved.id !== sessionToSave.id,
          )
          .forEach((saved) => store.delete(saved.id));
        store.put(sessionToSave);
      };
      activeRequest.onerror = () => reject(activeRequest.error);
    } else {
      store.put(sessionToSave);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function readActive(): Promise<TrainingSession | undefined> {
  const all = await readAllSessions();
  const activeSessions = all
    .filter((session) => session.status === "active")
    .sort(
      (left, right) =>
        (right.updatedAt ?? right.startedAt) -
        (left.updatedAt ?? left.startedAt),
    );
  const latest = activeSessions[0];
  if (latest && activeSessions.length > 1) {
    await removeSessions(activeSessions.slice(1).map((session) => session.id));
  }
  return latest;
}
export async function readCompleted(): Promise<TrainingSession[]> {
  const all = await readAllSessions();
  return all
    .filter((x) => x.status === "completed")
    .sort((a, b) => b.startedAt - a.startedAt);
}

/** Removes only an abandoned in-progress session; completed history remains untouched. */
export async function discardSession(sessionId: string) {
  await removeSessions([sessionId]);
}

async function removeSessions(sessionIds: string[]) {
  if (!sessionIds.length) return;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    sessionIds.forEach((sessionId) =>
      transaction.objectStore(STORE).delete(sessionId),
    );
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}
