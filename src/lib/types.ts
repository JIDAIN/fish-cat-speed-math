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
] as const;
export type QuestionType = (typeof questionTypes)[number];
export type Subtype =
  | "standard"
  | "quotient_first"
  | "quotient_two"
  | "percent_to_fraction"
  | "fraction_to_percent"
  | "comparison";
export interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  subtype: Subtype;
  prompt: string;
  answer: string;
  acceptedRange?: { min: number; max: number };
  data: Record<string, string | number | boolean | string[]>;
  difficulty: { level: 1 | 2 | 3 | 4 | 5; tags: string[] };
  /** Unique category used for future deterministic question-set quotas. */
  primaryStructure: string;
  /** Additional descriptive traits; unlike primaryStructure, these may overlap. */
  secondaryTags: string[];
  generationRuleVersion: string;
}
export interface QuestionRecord {
  question: GeneratedQuestion;
  userAnswer: string;
  isCorrect: boolean;
  accuracyLevel: "exact" | "accepted" | "wrong";
  timeUsedMs: number;
  restartCount: number;
  usedScratchpad: boolean;
}
export interface TrainingSession {
  id: string;
  userId: string;
  questionType: QuestionType;
  subtype: Subtype;
  /** Chosen count for a new session. Old data receives the saved set length. */
  questionCount: number;
  questions: GeneratedQuestion[];
  currentIndex: number;
  records: QuestionRecord[];
  currentAnswer: string;
  /** Restarts for the question currently on screen; copied into QuestionRecord on submit. */
  currentRestartCount: number;
  accumulatedMs: number;
  runningSince: number | null;
  pauseDurationMs: number;
  status: "active" | "completed" | "abandoned";
  startedAt: number;
  /** Optional so sessions saved by earlier releases remain readable. */
  updatedAt?: number;
}
export const typeLabels: Record<QuestionType, string> = {
  two_digit_add_subtract: "两位数加减",
  three_digit_add_subtract: "三位数加减",
  two_by_one_multiply: "两位数×一位数",
  two_by_two_multiply: "两位数×两位数",
  three_by_two_division: "三位数÷两位数",
  multi_digit_division: "多位数直除",
  multi_number_add_subtract: "多数加减",
  fraction_percent_conversion: "分数—百分数",
  fraction_comparison: "分数比大小",
};
export const subtypeLabels: Record<Subtype, string> = {
  standard: "标准训练",
  quotient_first: "求商首位",
  quotient_two: "求商前两位",
  percent_to_fraction: "百分数转分数",
  fraction_to_percent: "分数转百分数",
  comparison: "比较大小",
};
