import {
  generateSet,
  GenerationContext,
  productionGenerationContext,
} from "./generate";
import { migrateExistingQuestionToSkillV2 } from "./legacy-skill-migration";
import {
  isValidNewTrainingQuestionCount,
  isValidStoredQuestionCount,
} from "./question-count";
import {
  DifficultyBand,
  QuestionType,
  SkillId,
  Subtype,
  TrainingMode,
  TrainingSession,
} from "./types";

interface CreateTrainingSessionOptions {
  userId: string;
  questionType: QuestionType;
  subtype: Subtype;
  questionCount: number;
  now?: number;
  createSessionId?: () => string;
  generationContext?: GenerationContext;
  ownerAccountId?: string;
  questions?: TrainingSession["questions"];
  pkChallengeId?: string;
  trainingMode?: TrainingMode;
  primarySkillId?: SkillId;
  difficultyBand?: DifficultyBand;
}

function onlyValue<T>(values: readonly (T | undefined)[]): T | undefined {
  const unique = Array.from(new Set(values.filter((value): value is T => value !== undefined)));
  return unique.length === 1 ? unique[0] : undefined;
}

/** Creates one entirely fresh training run from frozen training parameters. */
export function createTrainingSession({
  userId,
  questionType,
  subtype,
  questionCount,
  now = Date.now(),
  createSessionId = () => globalThis.crypto.randomUUID(),
  generationContext = productionGenerationContext,
  ownerAccountId,
  questions,
  pkChallengeId,
  trainingMode,
  primarySkillId,
  difficultyBand,
}: CreateTrainingSessionOptions): TrainingSession {
  // New sessions use 10/20 only. A frozen legacy PK set may still contain a
  // previously-supported 30–100 question count and must remain playable.
  const validCount = questions
    ? isValidStoredQuestionCount(questionCount)
    : isValidNewTrainingQuestionCount(questionCount);
  if (!validCount) {
    throw new RangeError("Invalid question count");
  }

  // Only newly generated questions are decorated with V2 capability metadata.
  // Frozen legacy/PK question sets are preserved byte-for-byte so historical
  // challenges and recoverable sessions never change meaning after an update.
  const newlyGenerated = questions === undefined;
  const frozenQuestions =
    questions ??
    generateSet(questionType, subtype, questionCount, generationContext).map(
      migrateExistingQuestionToSkillV2,
    );

  const inferredPrimarySkillId = newlyGenerated
    ? onlyValue(frozenQuestions.map((question) => question.skillId))
    : undefined;
  const inferredDifficultyBand = newlyGenerated
    ? onlyValue(frozenQuestions.map((question) => question.difficultyBand))
    : undefined;
  const hasMigratedSkills =
    newlyGenerated && frozenQuestions.some((question) => question.skillId !== undefined);
  const effectivePrimarySkillId = primarySkillId ?? inferredPrimarySkillId;
  const effectiveDifficultyBand = difficultyBand ?? inferredDifficultyBand;
  const effectiveTrainingMode =
    trainingMode ??
    (effectivePrimarySkillId
      ? "skill"
      : hasMigratedSkills
        ? "mixed"
        : "legacy");

  return {
    id: createSessionId(),
    userId,
    questionType,
    subtype,
    questionCount,
    questions: frozenQuestions,
    currentIndex: 0,
    records: [],
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 0,
    runningSince: now,
    pauseDurationMs: 0,
    status: "active",
    startedAt: now,
    ownerAccountId,
    trainingSource: pkChallengeId ? "pk" : "normal",
    pkChallengeId,
    pkSyncStatus: pkChallengeId ? "not_synced" : undefined,
    schemaVersion: 2,
    trainingMode: effectiveTrainingMode,
    primarySkillId: effectivePrimarySkillId,
    difficultyBand: effectiveDifficultyBand,
  };
}
