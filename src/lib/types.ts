export const questionTypes = [
  "two_digit_add_subtract",
  "three_digit_add_subtract",
  "two_by_one_multiply",
  "two_by_two_multiply",
  "three_by_two_division",
  "multi_digit_division",
  "multi_number_add_subtract",
  "fraction_percent_conversion",
  "fraction_comparison",
  "special_hundred_scaling_division",
  "skill_drill",
] as const;
export type QuestionType = (typeof questionTypes)[number];

/**
 * Formal runtime ability IDs are currently the eight A abilities. The C prefix
 * is reserved for the already-planned C task interface; B is method/explanation
 * vocabulary and is deliberately not an ability-ID namespace.
 */
export type SkillId = `A-${string}` | `C-${string}`;
export type DifficultyBand = "L1" | "L2" | "L3";
export type MasteryProfile = "R" | "C" | "D" | "S" | "F";

export type LegacySubtype =
  | "standard"
  | "quotient_first"
  | "quotient_two"
  | "quotient_estimate_3_percent"
  | "percent_to_fraction"
  | "fraction_to_percent"
  | "comparison"
  | "carry_intensive"
  | "hundred_scaling"
  | "skill_drill";
export type SkillDrillSubtype = `skill:${SkillId}:${DifficultyBand}`;
export type SmartTrainingMode = "mixed";
export type SmartTrainingSubtype = `${SmartTrainingMode}:${DifficultyBand}`;
export type Subtype = LegacySubtype | SkillDrillSubtype | SmartTrainingSubtype;

export function makeSkillDrillSubtype(
  skillId: SkillId,
  difficultyBand: DifficultyBand,
): SkillDrillSubtype {
  return `skill:${skillId}:${difficultyBand}`;
}

export function parseSkillDrillSubtype(
  subtype: Subtype | string,
): { skillId: SkillId; difficultyBand: DifficultyBand } | undefined {
  if (!subtype.startsWith("skill:")) return undefined;
  const [, skillId, difficultyBand, extra] = subtype.split(":");
  if (
    extra !== undefined ||
    !/^[AC]-.+/.test(skillId ?? "") ||
    (difficultyBand !== "L1" &&
      difficultyBand !== "L2" &&
      difficultyBand !== "L3")
  )
    return undefined;
  return { skillId: skillId as SkillId, difficultyBand };
}

export function makeSmartTrainingSubtype(
  mode: SmartTrainingMode,
  difficultyBand: DifficultyBand,
): SmartTrainingSubtype {
  return `${mode}:${difficultyBand}`;
}

export function parseSmartTrainingSubtype(
  subtype: Subtype | string,
): { mode: SmartTrainingMode; difficultyBand: DifficultyBand } | undefined {
  const [mode, difficultyBand, extra] = subtype.split(":");
  if (
    extra !== undefined ||
    mode !== "mixed" ||
    (difficultyBand !== "L1" &&
      difficultyBand !== "L2" &&
      difficultyBand !== "L3")
  )
    return undefined;
  return { mode, difficultyBand };
}

/** diagnostic/path_compare are accepted only to deserialize old experimental records. */
export type TrainingMode =
  | "legacy"
  | "skill"
  | "flow"
  | "mixed"
  | "diagnostic"
  | "path_compare";
export type TargetPrecision =
  | "exact"
  | "1%"
  | "3%"
  | "5%"
  | "range"
  | "magnitude";
export type StructuredInputKind =
  | "number"
  | "choice"
  | "percent_blocks"
  | "sequence"
  | "steps";
export type AnswerValue = string | number | boolean;
export type QuestionDataValue =
  | string
  | number
  | boolean
  | string[]
  | number[];
export type GeneratorParams = Record<string, QuestionDataValue>;

export interface QuestionStepChoice {
  value: string;
  label: string;
}

/** Generic method-step schema retained for future C method UI; steps are not abilities. */
export interface QuestionStepSpec {
  id: string;
  /** @deprecated Read-only compatibility metadata; never feeds current Mastery. */
  stepSkillId?: SkillId;
  stepType: string;
  prompt: string;
  inputKind: StructuredInputKind;
  expectedValue?: AnswerValue;
  allowedAnswerSet?: AnswerValue[];
  targetPrecision?: TargetPrecision;
  acceptedRange?: { min: number; max: number };
  choices?: QuestionStepChoice[];
}

export interface StepRecord {
  stepId: string;
  /** @deprecated Read-only compatibility metadata; never feeds current Mastery. */
  stepSkillId?: SkillId;
  stepType: string;
  userValue?: AnswerValue;
  expectedValue?: AnswerValue;
  decisionValue?: string;
  isCorrect: boolean;
  durationMs: number;
  submitCount: number;
  editCount: number;
  skipped: boolean;
  timingInterrupted: boolean;
}

export interface StepTimerSnapshot {
  accumulatedMs: number;
  runningSince: number | null;
  interrupted: boolean;
}

export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  subtype: Subtype;
  prompt: string;
  answer: string;
  acceptedRange?: { min: number; max: number };
  data: Record<string, QuestionDataValue>;
  difficulty: { level: 1 | 2 | 3 | 4 | 5; tags: string[] };
  primaryStructure: string;
  secondaryTags: string[];
  generationRuleVersion: string;
  /** Optional so frozen classic questions remain readable without fake A IDs. */
  skillId?: SkillId;
  /** @deprecated Compatibility-only metadata; current A Mastery ignores it. */
  secondarySkillIds?: SkillId[];
  difficultyBand?: DifficultyBand;
  structureTags?: string[];
  targetPrecision?: TargetPrecision;
  generatorParams?: GeneratorParams;
  allowedAnswerSet?: AnswerValue[];
  masteryProfile?: MasteryProfile;
  inputKind?: StructuredInputKind;
  stepSpecs?: QuestionStepSpec[];
}

export interface QuestionRecord {
  question: GeneratedQuestion;
  userAnswer: string;
  isCorrect: boolean;
  accuracyLevel: "exact" | "accepted" | "wrong";
  timeUsedMs: number;
  restartCount: number;
  usedScratchpad: boolean;
  relativeError?: number;
  submitCount?: number;
  editCount?: number;
  skipped?: boolean;
  timingInterrupted?: boolean;
  steps?: StepRecord[];
}

export interface RatingSnapshot {
  version: string;
  level: "优秀" | "良好" | "合格" | "继续加油";
  correctCount: number;
  questionCount: number;
  elapsedMs: number;
}

export interface TrainingSession {
  id: string;
  userId: string;
  questionType: QuestionType;
  subtype: Subtype;
  questionCount: number;
  questions: GeneratedQuestion[];
  currentIndex: number;
  records: QuestionRecord[];
  currentAnswer: string;
  currentRestartCount: number;
  accumulatedMs: number;
  runningSince: number | null;
  pauseDurationMs: number;
  status: "active" | "completed" | "abandoned";
  startedAt: number;
  completedAt?: number;
  updatedAt?: number;
  ownerAccountId?: string;
  syncedAt?: number;
  syncStatus?: "syncing" | "synced" | "not_synced" | "failed";
  rating?: RatingSnapshot;
  trainingSource?: "normal" | "pk";
  pkChallengeId?: string;
  pkSyncStatus?: "not_synced" | "syncing" | "synced" | "failed";
  schemaVersion?: 1 | 2;
  trainingMode?: TrainingMode;
  primarySkillId?: SkillId;
  difficultyBand?: DifficultyBand;
  currentStepIndex?: number;
  currentStepAnswer?: string;
  currentStepRecords?: StepRecord[];
  currentStepTimer?: StepTimerSnapshot;
  currentStepEditCount?: number;
}

export const typeLabels: Record<QuestionType, string> = {
  two_digit_add_subtract: "两位数加减",
  three_digit_add_subtract: "三位数加减",
  two_by_one_multiply: "两位数×一位数",
  two_by_two_multiply: "两位数×两位数",
  three_by_two_division: "三位数÷两位数",
  multi_digit_division: "多位数直除",
  multi_number_add_subtract: "多位数相加",
  fraction_percent_conversion: "分数—百分数",
  fraction_comparison: "分数比大小",
  special_hundred_scaling_division: "专项：整百放缩修正",
  skill_drill: "纯计算能力专项",
};

export const subtypeLabels: Record<string, string> = {
  standard: "标准训练",
  quotient_first: "求商首位",
  quotient_two: "求商前两位",
  quotient_estimate_3_percent: "3%估算",
  percent_to_fraction: "百分数转分数",
  fraction_to_percent: "分数转百分数",
  comparison: "比较大小",
  carry_intensive: "进位强化",
  hundred_scaling: "整百放缩修正",
  skill_drill: "专项训练",
};

export function getSubtypeLabel(
  questionType: QuestionType,
  subtype: Subtype,
): string {
  if (questionType === "two_by_two_multiply" && subtype === "standard") {
    return "综合训练";
  }
  const skill = parseSkillDrillSubtype(subtype);
  if (skill) return `${skill.skillId} · ${skill.difficultyBand}`;
  const smart = parseSmartTrainingSubtype(subtype);
  if (smart) return `A层混合训练 · ${smart.difficultyBand}`;
  return subtypeLabels[subtype] ?? subtype;
}
