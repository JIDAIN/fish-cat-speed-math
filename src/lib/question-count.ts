/** The single runtime contract for every newly created training set. */
export const MIN_QUESTION_COUNT = 10;
export const MAX_QUESTION_COUNT = 100;
export const QUESTION_COUNT_STEP = 10;

export const QUICK_QUESTION_COUNT = 10;
export const STANDARD_QUESTION_COUNT = 20;
export const DEFAULT_CUSTOM_QUESTION_COUNT = 30;

export const questionCountOptions = Array.from(
  {
    length: (MAX_QUESTION_COUNT - MIN_QUESTION_COUNT) / QUESTION_COUNT_STEP + 1,
  },
  (_, index) => MIN_QUESTION_COUNT + index * QUESTION_COUNT_STEP,
);

export type QuestionCountMode = "quick" | "standard" | "custom";

export function isValidQuestionCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_QUESTION_COUNT &&
    value <= MAX_QUESTION_COUNT &&
    value % QUESTION_COUNT_STEP === 0
  );
}

export function modeForQuestionCount(count: number): QuestionCountMode {
  if (count === QUICK_QUESTION_COUNT) return "quick";
  if (count === STANDARD_QUESTION_COUNT) return "standard";
  return "custom";
}
