import { generateMixedSkillSet, generatePathComparisonSet } from "./batch8-training";
import { learnedImplementedSkillIds } from "./mastery";
import {
  generateSet,
  GenerationContext,
  productionGenerationContext,
} from "./generate";
import {
  generateSkillDrillSet,
  ImplementedSkillId,
  isImplementedSkillId,
} from "./implemented-skill-drills";
import { migrateExistingQuestionToSkillV2 } from "./legacy-skill-migration";
import {
  isValidNewTrainingQuestionCount,
  isValidStoredQuestionCount,
} from "./question-count";
import { startStepTimer } from "./timer";
import {
  DifficultyBand,
  parseSkillDrillSubtype,
  parseSmartTrainingSubtype,
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
  history?: TrainingSession[];
}

function onlyValue<T>(values: readonly (T | undefined)[]): T | undefined {
  const unique = Array.from(
    new Set(values.filter((value): value is T => value !== undefined)),
  );
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
  history = [],
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
  const encodedSkill =
    questionType === "skill_drill" ? parseSkillDrillSubtype(subtype) : undefined;
  const smartTraining =
    questionType === "skill_drill" ? parseSmartTrainingSubtype(subtype) : undefined;
  const requestedSkillId = primarySkillId ?? encodedSkill?.skillId;
  const requestedSkillDifficulty =
    difficultyBand ??
    encodedSkill?.difficultyBand ??
    smartTraining?.difficultyBand ??
    "L2";
  if (
    newlyGenerated &&
    questionType === "skill_drill" &&
    !smartTraining &&
    !isImplementedSkillId(requestedSkillId)
  ) {
    throw new Error("skill_drill sessions require an implemented skill ID");
  }

  const generatedSkillQuestions =
    newlyGenerated && questionType === "skill_drill"
      ? smartTraining?.mode === "mixed"
        ? generateMixedSkillSet(
            learnedImplementedSkillIds(history, userId),
            smartTraining.difficultyBand,
            questionCount,
            generationContext,
          )
        : smartTraining?.mode === "path_compare"
          ? generatePathComparisonSet(
              smartTraining.difficultyBand,
              questionCount,
              generationContext,
            )
          : generateSkillDrillSet(
              requestedSkillId as ImplementedSkillId,
              requestedSkillDifficulty,
              questionCount,
              generationContext,
            )
      : undefined;

  const frozenQuestions =
    questions ??
    (questionType === "skill_drill"
      ? (generatedSkillQuestions ?? [])
      : generateSet(questionType, subtype, questionCount, generationContext).map(
          migrateExistingQuestionToSkillV2,
        ));

  const inferredPrimarySkillId = newlyGenerated
    ? onlyValue(frozenQuestions.map((question) => question.skillId))
    : undefined;
  const inferredDifficultyBand = newlyGenerated
    ? onlyValue(frozenQuestions.map((question) => question.difficultyBand))
    : undefined;
  const hasMigratedSkills =
    newlyGenerated &&
    frozenQuestions.some((question) => question.skillId !== undefined);
  const hasStructuredFlow = frozenQuestions.every(
    (question) =>
      question.inputKind === "steps" && Boolean(question.stepSpecs?.length),
  );
  const effectivePrimarySkillId =
    primarySkillId ?? encodedSkill?.skillId ?? inferredPrimarySkillId;
  const effectiveDifficultyBand =
    difficultyBand ??
    smartTraining?.difficultyBand ??
    encodedSkill?.difficultyBand ??
    inferredDifficultyBand;
  const effectiveTrainingMode =
    trainingMode ??
    (smartTraining?.mode === "mixed"
      ? "mixed"
      : smartTraining?.mode === "path_compare"
        ? "path_compare"
        : hasStructuredFlow
          ? "flow"
          : effectivePrimarySkillId
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
    currentStepIndex: hasStructuredFlow ? 0 : undefined,
    currentStepAnswer: hasStructuredFlow ? "" : undefined,
    currentStepRecords: hasStructuredFlow ? [] : undefined,
    currentStepTimer: hasStructuredFlow ? startStepTimer(now) : undefined,
    currentStepEditCount: hasStructuredFlow ? 0 : undefined,
  };
}
