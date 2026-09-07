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
  GeneratedQuestion,
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

const percentBlockNumericCodes: Readonly<Record<string, string>> = {
  "100": "11",
  "50": "12",
  "25": "1",
  "20": "2",
  "12.5": "3",
  "10": "4",
  "5": "5",
  "3": "6",
  "2.5": "7",
  "2": "8",
  "1": "9",
  "0.1": "0",
};

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function encodeSemanticAllowedAnswers(
  values: readonly (string | number | boolean)[] | undefined,
  encode: (value: string) => string | undefined,
): string[] | undefined {
  if (!values?.length) return undefined;
  const encoded = values
    .map((value) => encode(String(value)))
    .filter((value): value is string => value !== undefined);
  return encoded.length ? Array.from(new Set(encoded)) : undefined;
}

/**
 * The shared training screen still uses NumberPad for ordinary one-answer
 * skill drills. Until all semantic inputs use the V2 renderer, choice,
 * sequence and percentage-block paths are encoded as numeric codes. Full step
 * flows are not adapted: they are rendered by StructuredAnswerInput step by
 * step.
 */
function adaptSkillQuestionToCurrentTrainingUi(
  question: GeneratedQuestion,
): GeneratedQuestion {
  if (question.inputKind === "choice" || question.inputKind === "sequence") {
    const semanticInputKind = question.inputKind;
    const values = stringArray(question.data.choiceValues);
    const labels = stringArray(question.data.choiceLabels);
    if (!values.length || values.length !== labels.length) return question;

    const codeFor = (semanticValue: string) => {
      const index = values.indexOf(semanticValue);
      return index < 0 ? undefined : String(index + 1);
    };
    const encodedAnswer = codeFor(question.answer);
    if (!encodedAnswer) return question;
    const encodedAllowed = encodeSemanticAllowedAnswers(
      question.allowedAnswerSet,
      codeFor,
    );
    const legend = labels
      .map((label, index) => `${index + 1}=${label}`)
      .join("；");
    return {
      ...question,
      prompt: `${question.prompt}（${legend}）`,
      answer: encodedAnswer,
      inputKind: "number",
      allowedAnswerSet: encodedAllowed ?? [encodedAnswer],
      generatorParams: {
        ...(question.generatorParams ?? {}),
        semanticInputKind,
        semanticAnswer: question.answer,
        uiAdapter:
          semanticInputKind === "sequence"
            ? "sequence_numeric_code_v1"
            : "choice_numeric_code_v1",
      },
    };
  }

  if (question.inputKind === "percent_blocks") {
    const encodePath = (path: string) => {
      const blocks = path.split(",").filter(Boolean);
      const codes = blocks.map((block) => percentBlockNumericCodes[block]);
      return codes.some((code) => code === undefined)
        ? undefined
        : codes.join("");
    };
    const encodedAnswer = encodePath(question.answer);
    if (!encodedAnswer) return question;
    const encodedAllowed = encodeSemanticAllowedAnswers(
      question.allowedAnswerSet,
      encodePath,
    );
    const legend = [
      "11=100%",
      "12=50%",
      "1=25%",
      "2=20%",
      "3=12.5%",
      "4=10%",
      "5=5%",
      "6=3%",
      "7=2.5%",
      "8=2%",
      "9=1%",
      "0=0.1%",
    ].join("；");
    return {
      ...question,
      prompt: `${question.prompt}（按块依次输入代码：${legend}）`,
      answer: encodedAnswer,
      inputKind: "number",
      allowedAnswerSet: encodedAllowed ?? [encodedAnswer],
      generatorParams: {
        ...(question.generatorParams ?? {}),
        semanticInputKind: "percent_blocks",
        semanticAnswer: question.answer,
        uiAdapter: "percent_blocks_numeric_code_v1",
      },
    };
  }

  return question;
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
      ? (generatedSkillQuestions ?? []).map(adaptSkillQuestionToCurrentTrainingUi)
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
