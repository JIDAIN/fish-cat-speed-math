/**
 * New pure-computation skill sessions intentionally stay short: 10 questions
 * for quick practice or 20 for the standard run. Legacy 30–100 question
 * sessions remain readable and resumable through the separate stored-data
 * validator below.
 */
export const QUICK_QUESTION_COUNT = 10;
export const STANDARD_QUESTION_COUNT = 20;
export const NEW_QUESTION_COUNT_OPTIONS = [
  QUICK_QUESTION_COUNT,
  STANDARD_QUESTION_COUNT,
] as const;

/** Public options for newly-created sessions. */
export const questionCountOptions = [...NEW_QUESTION_COUNT_OPTIONS];

/** Legacy compatibility contract. Never use this range to offer new sessions. */
export const LEGACY_MIN_QUESTION_COUNT = 10;
export const LEGACY_MAX_QUESTION_COUNT = 100;
export const LEGACY_QUESTION_COUNT_STEP = 10;
export const legacyQuestionCountOptions = Array.from(
  {
    length:
      (LEGACY_MAX_QUESTION_COUNT - LEGACY_MIN_QUESTION_COUNT) /
        LEGACY_QUESTION_COUNT_STEP +
      1,
  },
  (_, index) =>
    LEGACY_MIN_QUESTION_COUNT + index * LEGACY_QUESTION_COUNT_STEP,
);

/** Retained only so older UI/state imports do not break during migration. */
export const DEFAULT_CUSTOM_QUESTION_COUNT = 30;

export type QuestionCountMode = "quick" | "standard" | "custom";

export function isValidNewTrainingQuestionCount(value: unknown): value is 10 | 20 {
  return value === QUICK_QUESTION_COUNT || value === STANDARD_QUESTION_COUNT;
}

export function isValidStoredQuestionCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= LEGACY_MIN_QUESTION_COUNT &&
    value <= LEGACY_MAX_QUESTION_COUNT &&
    value % LEGACY_QUESTION_COUNT_STEP === 0
  );
}

/**
 * Backward-compatible alias used by legacy readers. New-session creation must
 * call isValidNewTrainingQuestionCount explicitly.
 */
export const isValidQuestionCount = isValidStoredQuestionCount;

export function modeForQuestionCount(count: number): QuestionCountMode {
  if (count === QUICK_QUESTION_COUNT) return "quick";
  if (count === STANDARD_QUESTION_COUNT) return "standard";
  return "custom";
}
