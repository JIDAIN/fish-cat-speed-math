import { grade } from "./generate";
import { QuestionRecord, TrainingSession } from "./types";

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
