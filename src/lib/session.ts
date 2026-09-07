import {
  generateSet,
  GenerationContext,
  productionGenerationContext,
} from "./generate";
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

  return {
    id: createSessionId(),
    userId,
    questionType,
    subtype,
    questionCount,
    questions:
      questions ??
      generateSet(questionType, subtype, questionCount, generationContext),
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
    trainingMode: trainingMode ?? (primarySkillId ? "skill" : "legacy"),
    primarySkillId,
    difficultyBand,
  };
}
