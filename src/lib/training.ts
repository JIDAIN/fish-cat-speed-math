import { grade } from "./generate";
import {
  AnswerValue,
  QuestionRecord,
  QuestionStepSpec,
  StepRecord,
  TrainingSession,
} from "./types";

function numericRelativeError(answer: string, expected: string) {
  const actual = Number(answer.replace("%", ""));
  const target = Number(expected.replace("%", ""));
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target === 0)
    return undefined;
  return Math.abs(actual - target) / Math.abs(target);
}

/**
 * Creates one normalized step record. Step-specific graders can compute
 * isCorrect before calling this helper; the record shape stays common across
 * direct division, split division and compensation flows.
 */
export function createStepRecord(input: {
  spec: QuestionStepSpec;
  userValue?: AnswerValue;
  isCorrect: boolean;
  durationMs: number;
  submitCount?: number;
  editCount?: number;
  skipped?: boolean;
  timingInterrupted?: boolean;
  decisionValue?: string;
}): StepRecord {
  return {
    stepId: input.spec.id,
    stepSkillId: input.spec.stepSkillId,
    stepType: input.spec.stepType,
    userValue: input.userValue,
    expectedValue: input.spec.expectedValue,
    decisionValue: input.decisionValue,
    isCorrect: input.isCorrect,
    durationMs: Math.max(0, input.durationMs),
    submitCount: input.submitCount ?? 1,
    editCount: input.editCount ?? 0,
    skipped: input.skipped ?? false,
    timingInterrupted: input.timingInterrupted ?? false,
  };
}

/**
 * Applies one answer at most once. An empty answer or a finished session is a
 * no-op, making duplicate fast taps on submit harmless.
 */
export function submitCurrentAnswer(
  session: TrainingSession,
  elapsedMs: number,
  usedScratchpad: boolean,
  completedAt = Date.now(),
): TrainingSession {
  const question = session.questions[session.currentIndex];
  if (!question || !session.currentAnswer || session.status !== "active") {
    return session;
  }

  const grading = grade(question, session.currentAnswer);
  const previousDurationMs = session.records.reduce(
    (total, record) => total + record.timeUsedMs,
    0,
  );
  const record: QuestionRecord = {
    question,
    userAnswer: session.currentAnswer,
    isCorrect: grading.isCorrect,
    accuracyLevel: grading.accuracyLevel,
    timeUsedMs: Math.max(0, elapsedMs - previousDurationMs),
    restartCount: session.currentRestartCount ?? 0,
    usedScratchpad,
    relativeError: numericRelativeError(session.currentAnswer, question.answer),
    submitCount: 1,
    editCount: 0,
    skipped: false,
    timingInterrupted: false,
    steps: [],
  };
  const next = {
    ...session,
    records: [...session.records, record],
    currentAnswer: "",
    currentRestartCount: 0,
    currentIndex: session.currentIndex + 1,
  };

  return next.currentIndex === next.questions.length
    ? {
        ...next,
        status: "completed" as const,
        accumulatedMs: elapsedMs,
        runningSince: null,
        completedAt,
      }
    : next;
}
