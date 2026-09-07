import { grade } from "./generate";
import { gradeSkillDrillQuestion } from "./implemented-skill-drills";
import { finishStepTimer, startStepTimer } from "./timer";
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

export function gradeQuestionStep(spec: QuestionStepSpec, input: string) {
  const normalized = input.trim();
  const allowed = spec.allowedAnswerSet?.map(String) ?? [];
  if (allowed.includes(normalized))
    return { isCorrect: true, accuracyLevel: "exact" as const };

  const expected = spec.expectedValue;
  if (expected === undefined)
    return { isCorrect: false, accuracyLevel: "wrong" as const };

  if (spec.inputKind === "choice") {
    const isCorrect = normalized === String(expected);
    return {
      isCorrect,
      accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
    };
  }

  const actualNumber = Number(normalized.replace("%", ""));
  const expectedNumber = Number(String(expected).replace("%", ""));
  if (Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)) {
    const epsilon = Number.EPSILON * Math.max(1, Math.abs(expectedNumber));
    if (Math.abs(actualNumber - expectedNumber) <= epsilon)
      return { isCorrect: true, accuracyLevel: "exact" as const };
    if (
      spec.acceptedRange &&
      actualNumber >= spec.acceptedRange.min &&
      actualNumber <= spec.acceptedRange.max
    )
      return { isCorrect: true, accuracyLevel: "accepted" as const };
  }

  const isCorrect = normalized === String(expected);
  return {
    isCorrect,
    accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
  };
}

/**
 * Submits one structured-flow step. Each step receives its own timer and record;
 * the outer question is written only after the final step so history keeps both
 * per-step diagnostics and one normal question-level result.
 */
export function submitCurrentStep(
  session: TrainingSession,
  elapsedMs: number,
  usedScratchpad: boolean,
  now = Date.now(),
): TrainingSession {
  if (session.status !== "active") return session;
  const question = session.questions[session.currentIndex];
  if (question?.inputKind !== "steps" || !question.stepSpecs?.length)
    return session;

  const stepIndex = session.currentStepIndex ?? 0;
  const spec = question.stepSpecs[stepIndex];
  const answer = session.currentStepAnswer ?? "";
  if (!spec || !answer) return session;

  const grading = gradeQuestionStep(spec, answer);
  const timer = session.currentStepTimer ?? {
    accumulatedMs: 0,
    runningSince: null,
    interrupted: true,
  };
  const timing = finishStepTimer(timer, now);
  const stepRecord = createStepRecord({
    spec,
    userValue: answer,
    decisionValue: spec.inputKind === "choice" ? answer : undefined,
    isCorrect: grading.isCorrect,
    durationMs: timing.durationMs,
    submitCount: 1,
    editCount: session.currentStepEditCount ?? 0,
    timingInterrupted: timing.timingInterrupted,
  });
  const stepRecords = [...(session.currentStepRecords ?? []), stepRecord];
  const nextStepIndex = stepIndex + 1;

  if (nextStepIndex < question.stepSpecs.length) {
    return {
      ...session,
      currentStepIndex: nextStepIndex,
      currentStepAnswer: "",
      currentStepRecords: stepRecords,
      currentStepTimer: startStepTimer(now),
      currentStepEditCount: 0,
    };
  }

  const allStepsCorrect = stepRecords.every((record) => record.isCorrect);
  const questionDurationMs = stepRecords.reduce(
    (total, record) => total + record.durationMs,
    0,
  );
  const record: QuestionRecord = {
    question,
    userAnswer: answer,
    isCorrect: allStepsCorrect,
    accuracyLevel: allStepsCorrect ? grading.accuracyLevel : "wrong",
    timeUsedMs: questionDurationMs,
    restartCount: session.currentRestartCount ?? 0,
    usedScratchpad,
    relativeError: numericRelativeError(answer, question.answer),
    submitCount: stepRecords.reduce((total, item) => total + item.submitCount, 0),
    editCount: stepRecords.reduce((total, item) => total + item.editCount, 0),
    skipped: false,
    timingInterrupted: stepRecords.some((item) => item.timingInterrupted),
    steps: stepRecords,
  };
  const nextIndex = session.currentIndex + 1;
  const nextQuestion = session.questions[nextIndex];
  const nextHasSteps =
    nextQuestion?.inputKind === "steps" && Boolean(nextQuestion.stepSpecs?.length);
  const next: TrainingSession = {
    ...session,
    records: [...session.records, record],
    currentAnswer: "",
    currentRestartCount: 0,
    currentIndex: nextIndex,
    currentStepIndex: nextHasSteps ? 0 : undefined,
    currentStepAnswer: nextHasSteps ? "" : undefined,
    currentStepRecords: nextHasSteps ? [] : undefined,
    currentStepTimer: nextHasSteps ? startStepTimer(now) : undefined,
    currentStepEditCount: nextHasSteps ? 0 : undefined,
  };

  return nextIndex === session.questions.length
    ? {
        ...next,
        status: "completed",
        accumulatedMs: elapsedMs,
        runningSince: null,
        completedAt: now,
        currentStepIndex: undefined,
        currentStepAnswer: undefined,
        currentStepRecords: undefined,
        currentStepTimer: undefined,
        currentStepEditCount: undefined,
      }
    : next;
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

  const grading =
    question.type === "skill_drill"
      ? gradeSkillDrillQuestion(question, session.currentAnswer)
      : grade(question, session.currentAnswer);
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
