import { TrainingSession } from "./types";

/**
 * Restarts the question currently on screen. Time spent before restarting is
 * intentionally discarded, while the number of restarts is kept for review.
 */
export function restartCurrentQuestion(
  session: TrainingSession,
  now = Date.now(),
): TrainingSession {
  return {
    ...session,
    currentAnswer: "",
    currentRestartCount: (session.currentRestartCount ?? 0) + 1,
    accumulatedMs: session.records.reduce(
      (total, record) => total + record.timeUsedMs,
      0,
    ),
    runningSince: now,
  };
}
