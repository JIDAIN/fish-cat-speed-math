import {
  AnswerValue,
  DifficultyBand,
  GeneratedQuestion,
  LegacySubtype,
  MasteryProfile,
  parseSkillDrillSubtype,
  QuestionRecord,
  QuestionStepSpec,
  questionTypes,
  QuestionType,
  SkillId,
  StepRecord,
  StepTimerSnapshot,
  StructuredInputKind,
  Subtype,
  TargetPrecision,
  TrainingMode,
  TrainingSession,
} from "./types";
import { isValidStoredQuestionCount } from "./question-count";
import { grade, normalizeFractionComparisonAnswer } from "./generate";
import { isRegisteredSkillId } from "./skill-registry";
const DB = "speed-math-v1",
  STORE = "sessions";

const legacySubtypes: readonly LegacySubtype[] = [
  "standard",
  "quotient_first",
  "quotient_two",
  "quotient_estimate_3_percent",
  "percent_to_fraction",
  "fraction_to_percent",
  "comparison",
  "carry_intensive",
  "hundred_scaling",
  "skill_drill",
];
const difficultyBands: readonly DifficultyBand[] = ["L1", "L2", "L3"];
const masteryProfiles: readonly MasteryProfile[] = ["R", "C", "D", "S", "F"];
const inputKinds: readonly StructuredInputKind[] = [
  "number",
  "choice",
  "percent_blocks",
  "sequence",
  "steps",
];
const targetPrecisions: readonly TargetPrecision[] = [
  "exact",
  "1%",
  "3%",
  "5%",
  "range",
  "magnitude",
];
const trainingModes: readonly TrainingMode[] = [
  "legacy",
  "skill",
  "flow",
  "mixed",
  "diagnostic",
  "path_compare",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidSubtype(value: unknown): value is Subtype {
  if (typeof value !== "string") return false;
  if (legacySubtypes.includes(value as LegacySubtype)) return true;
  const parsed = parseSkillDrillSubtype(value);
  return Boolean(parsed && isRegisteredSkillId(parsed.skillId));
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeAnswerValue(value: unknown): AnswerValue | undefined {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? value
    : undefined;
}

function normalizeAnswerValueArray(value: unknown): AnswerValue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map(normalizeAnswerValue)
    .filter((item): item is AnswerValue => item !== undefined);
  return normalized.length === value.length ? normalized : undefined;
}

function normalizeStepChoices(value: unknown): QuestionStepSpec["choices"] {
  if (!Array.isArray(value)) return undefined;
  const choices = value
    .filter(isRecord)
    .map((item) =>
      typeof item.value === "string" && typeof item.label === "string"
        ? { value: item.value, label: item.label }
        : undefined,
    )
    .filter((item): item is { value: string; label: string } => Boolean(item));
  return choices.length === value.length ? choices : undefined;
}

function normalizeStepTimer(value: unknown): StepTimerSnapshot | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.accumulatedMs !== "number" ||
    (typeof value.runningSince !== "number" && value.runningSince !== null) ||
    typeof value.interrupted !== "boolean"
  )
    return undefined;
  return {
    accumulatedMs: Math.max(0, value.accumulatedMs),
    runningSince: value.runningSince,
    interrupted: value.interrupted,
  };
}

function normalizeSkillId(value: unknown): SkillId | undefined {
  return isRegisteredSkillId(value) ? value : undefined;
}

function normalizeSkillIdArray(value: unknown): SkillId[] {
  return Array.isArray(value)
    ? value
        .map(normalizeSkillId)
        .filter((item): item is SkillId => item !== undefined)
    : [];
}

function normalizeStepSpec(value: unknown): QuestionStepSpec | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" ||
    typeof value.stepType !== "string" ||
    typeof value.prompt !== "string" ||
    !inputKinds.includes(value.inputKind as StructuredInputKind)
  )
    return undefined;
  const targetPrecision = targetPrecisions.includes(
    value.targetPrecision as TargetPrecision,
  )
    ? (value.targetPrecision as TargetPrecision)
    : undefined;
  return {
    id: value.id,
    stepSkillId: normalizeSkillId(value.stepSkillId),
    stepType: value.stepType,
    prompt: value.prompt,
    inputKind: value.inputKind as StructuredInputKind,
    expectedValue: normalizeAnswerValue(value.expectedValue),
    allowedAnswerSet: normalizeAnswerValueArray(value.allowedAnswerSet),
    targetPrecision,
    acceptedRange:
      isRecord(value.acceptedRange) &&
      typeof value.acceptedRange.min === "number" &&
      typeof value.acceptedRange.max === "number"
        ? { min: value.acceptedRange.min, max: value.acceptedRange.max }
        : undefined,
    choices: normalizeStepChoices(value.choices),
  };
}

function normalizeStepRecord(value: unknown): StepRecord | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.stepId !== "string" ||
    typeof value.stepType !== "string" ||
    typeof value.isCorrect !== "boolean" ||
    typeof value.durationMs !== "number"
  )
    return undefined;
  return {
    stepId: value.stepId,
    stepSkillId: normalizeSkillId(value.stepSkillId),
    stepType: value.stepType,
    userValue: normalizeAnswerValue(value.userValue),
    expectedValue: normalizeAnswerValue(value.expectedValue),
    decisionValue:
      typeof value.decisionValue === "string" ? value.decisionValue : undefined,
    isCorrect: value.isCorrect,
    durationMs: Math.max(0, value.durationMs),
    submitCount:
      typeof value.submitCount === "number" ? value.submitCount : 1,
    editCount: typeof value.editCount === "number" ? value.editCount : 0,
    skipped: typeof value.skipped === "boolean" ? value.skipped : false,
    timingInterrupted:
      typeof value.timingInterrupted === "boolean"
        ? value.timingInterrupted
        : false,
  };
}

function normalizeQuestion(value: unknown): GeneratedQuestion | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" ||
    !questionTypes.includes(value.type as QuestionType) ||
    !isValidSubtype(value.subtype) ||
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
  const difficultyBand = difficultyBands.includes(
    value.difficultyBand as DifficultyBand,
  )
    ? (value.difficultyBand as DifficultyBand)
    : undefined;
  const masteryProfile = masteryProfiles.includes(
    value.masteryProfile as MasteryProfile,
  )
    ? (value.masteryProfile as MasteryProfile)
    : undefined;
  const targetPrecision = targetPrecisions.includes(
    value.targetPrecision as TargetPrecision,
  )
    ? (value.targetPrecision as TargetPrecision)
    : undefined;
  const inputKind = inputKinds.includes(value.inputKind as StructuredInputKind)
    ? (value.inputKind as StructuredInputKind)
    : undefined;
  const stepSpecs = Array.isArray(value.stepSpecs)
    ? value.stepSpecs
        .map(normalizeStepSpec)
        .filter((step): step is QuestionStepSpec => Boolean(step))
    : undefined;

  return {
    id: value.id,
    type: value.type as QuestionType,
    subtype: value.subtype,
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
    skillId: normalizeSkillId(value.skillId),
    secondarySkillIds: normalizeSkillIdArray(value.secondarySkillIds),
    difficultyBand,
    structureTags: normalizeStringArray(value.structureTags),
    targetPrecision,
    generatorParams: isRecord(value.generatorParams)
      ? (value.generatorParams as GeneratedQuestion["generatorParams"])
      : undefined,
    allowedAnswerSet: normalizeAnswerValueArray(value.allowedAnswerSet),
    masteryProfile,
    inputKind,
    stepSpecs,
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

  const userAnswer =
    question.type === "fraction_comparison"
      ? normalizeFractionComparisonAnswer(value.userAnswer)
      : value.userAnswer;
  // Repair only the known full-width comparison-symbol defect. Other
  // completed records retain their frozen grading result.
  const comparisonGrading =
    question.type === "fraction_comparison"
      ? grade(question, userAnswer)
      : undefined;
  const steps = Array.isArray(value.steps)
    ? value.steps
        .map(normalizeStepRecord)
        .filter((step): step is StepRecord => Boolean(step))
    : undefined;

  return {
    question,
    userAnswer,
    isCorrect: comparisonGrading?.isCorrect ?? value.isCorrect,
    accuracyLevel: comparisonGrading?.accuracyLevel ?? accuracyLevel,
    timeUsedMs: value.timeUsedMs,
    restartCount:
      typeof value.restartCount === "number" ? value.restartCount : 0,
    usedScratchpad:
      typeof value.usedScratchpad === "boolean" ? value.usedScratchpad : false,
    relativeError:
      typeof value.relativeError === "number" ? value.relativeError : undefined,
    submitCount:
      typeof value.submitCount === "number" ? value.submitCount : undefined,
    editCount: typeof value.editCount === "number" ? value.editCount : undefined,
    skipped: typeof value.skipped === "boolean" ? value.skipped : undefined,
    timingInterrupted:
      typeof value.timingInterrupted === "boolean"
        ? value.timingInterrupted
        : undefined,
    steps,
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
    !isValidSubtype(value.subtype) ||
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

  // Version 2.2.0 removed equality questions and the equality control. An
  // older active set containing one cannot be completed with the current UI,
  // so do not offer it for recovery. Completed history remains readable.
  if (
    status === "active" &&
    value.questionType === "fraction_comparison" &&
    questions.some((question) => question.answer === "=")
  )
    return undefined;

  // Earlier releases did not persist questionCount. Use the frozen question
  // set length rather than reinterpreting an old record with new UI rules.
  const savedQuestionCount = value.questionCount;
  const questionCount =
    typeof savedQuestionCount === "number" &&
    Number.isInteger(savedQuestionCount) &&
    savedQuestionCount > 0
      ? savedQuestionCount
      : questions.length;

  // Stored sessions keep the historical 10–100 compatibility contract. New
  // session creation applies the stricter 10/20 rule in session.ts.
  if (
    status === "active" &&
    savedQuestionCount !== undefined &&
    !isValidStoredQuestionCount(questionCount)
  )
    return undefined;

  const schemaVersion =
    value.schemaVersion === 2
      ? 2
      : value.schemaVersion === 1
        ? 1
        : undefined;
  const trainingMode = trainingModes.includes(value.trainingMode as TrainingMode)
    ? (value.trainingMode as TrainingMode)
    : undefined;
  const difficultyBand = difficultyBands.includes(
    value.difficultyBand as DifficultyBand,
  )
    ? (value.difficultyBand as DifficultyBand)
    : undefined;

  return {
    id: value.id,
    userId: value.userId,
    questionType: value.questionType as QuestionType,
    subtype: value.subtype,
    questionCount,
    questions,
    currentIndex: value.currentIndex,
    records,
    currentAnswer:
      value.questionType === "fraction_comparison"
        ? normalizeFractionComparisonAnswer(value.currentAnswer)
        : value.currentAnswer,
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
    completedAt:
      typeof value.completedAt === "number" ? value.completedAt : undefined,
    updatedAt:
      typeof value.updatedAt === "number" ? value.updatedAt : undefined,
    ownerAccountId:
      typeof value.ownerAccountId === "string"
        ? value.ownerAccountId
        : undefined,
    syncedAt: typeof value.syncedAt === "number" ? value.syncedAt : undefined,
    syncStatus:
      value.syncStatus === "syncing" ||
      value.syncStatus === "synced" ||
      value.syncStatus === "not_synced" ||
      value.syncStatus === "failed"
        ? value.syncStatus
        : typeof value.syncedAt === "number"
          ? "synced"
          : "not_synced",
    rating:
      isRecord(value.rating) &&
      typeof value.rating.version === "string" &&
      (value.rating.level === "优秀" ||
        value.rating.level === "良好" ||
        value.rating.level === "合格" ||
        value.rating.level === "继续加油") &&
      typeof value.rating.correctCount === "number" &&
      typeof value.rating.questionCount === "number" &&
      typeof value.rating.elapsedMs === "number"
        ? {
            version: value.rating.version,
            level: value.rating.level,
            correctCount: value.rating.correctCount,
            questionCount: value.rating.questionCount,
            elapsedMs: value.rating.elapsedMs,
          }
        : undefined,
    trainingSource: value.trainingSource === "pk" ? "pk" : "normal",
    pkChallengeId:
      typeof value.pkChallengeId === "string" ? value.pkChallengeId : undefined,
    pkSyncStatus:
      value.pkSyncStatus === "syncing" ||
      value.pkSyncStatus === "synced" ||
      value.pkSyncStatus === "failed" ||
      value.pkSyncStatus === "not_synced"
        ? value.pkSyncStatus
        : undefined,
    schemaVersion,
    trainingMode,
    primarySkillId: normalizeSkillId(value.primarySkillId),
    difficultyBand,
    currentStepIndex:
      typeof value.currentStepIndex === "number" && value.currentStepIndex >= 0
        ? Math.floor(value.currentStepIndex)
        : undefined,
    currentStepAnswer:
      typeof value.currentStepAnswer === "string"
        ? value.currentStepAnswer
        : undefined,
    currentStepRecords: Array.isArray(value.currentStepRecords)
      ? value.currentStepRecords
          .map(normalizeStepRecord)
          .filter((step): step is StepRecord => Boolean(step))
      : undefined,
    currentStepTimer: normalizeStepTimer(value.currentStepTimer),
    currentStepEditCount:
      typeof value.currentStepEditCount === "number"
        ? Math.max(0, Math.floor(value.currentStepEditCount))
        : undefined,
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

    // Each explicit account (and the separate unassigned/local scope) can
    // resume one exercise. Never let one account replace another account's
    // active session on the same browser.
    if (sessionToSave.status === "active") {
      const activeRequest = store.getAll();
      activeRequest.onsuccess = () => {
        const savedSessions = activeRequest.result as TrainingSession[];
        const sameSession = savedSessions.find(
          (saved) => saved.id === sessionToSave.id,
        );
        // A completed session is terminal. A delayed lifecycle/autosave write
        // from its former active state must never turn it back into an active
        // session or remove a newer active run for the same account.
        if (sameSession && sameSession.status !== "active") return;
        savedSessions
          .filter(
            (saved) =>
              saved.status === "active" &&
              saved.id !== sessionToSave.id &&
              saved.ownerAccountId === sessionToSave.ownerAccountId,
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
/**
 * Reads the latest active session only from the requested ownership scope.
 * `undefined` deliberately means legacy/unassigned local training, not any
 * signed-in account.
 */
export async function readActive(
  ownerAccountId?: string,
): Promise<TrainingSession | undefined> {
  const all = await readAllSessions();
  const activeSessions = all
    .filter(
      (session) =>
        session.status === "active" &&
        session.ownerAccountId === ownerAccountId,
    )
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

/** Explicitly assigns legacy completed sessions only after the user confirms. */
export async function claimCompletedSessions(
  sessionIds: string[],
  ownerAccountId: string,
) {
  const all = await readAllSessions();
  await Promise.all(
    all
      .filter(
        (session) =>
          sessionIds.includes(session.id) && session.status === "completed",
      )
      .map((session) => saveSession({ ...session, ownerAccountId })),
  );
}

/** Removes only explicitly discarded completed history from this browser. */
export async function discardCompletedSessions(sessionIds: string[]) {
  await removeSessions(sessionIds);
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
