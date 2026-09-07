import { TrainingSession } from "./types";

/** Stops the active segment while retaining all elapsed effective time. */
export function pauseSessionTimer(
  session: TrainingSession,
  now = Date.now(),
): TrainingSession {
  if (session.runningSince === null) return session;

  return {
    ...session,
    accumulatedMs: session.accumulatedMs + now - session.runningSince,
    runningSince: null,
  };
}

/** Starts a new active segment without counting any paused time. */
export function resumeSessionTimer(
  session: TrainingSession,
  now = Date.now(),
): TrainingSession {
  if (session.runningSince !== null) return session;
  return { ...session, runningSince: now };
}

/**
 * A process that was navigated away from can be restored from BFCache, or its
 * final IndexedDB write can be interrupted. In that case the old running
 * segment is unverified: discarding it is safer than incorrectly charging
 * background time to a training result.
 */
export function suspendUnverifiedTimer(
  session: TrainingSession,
): TrainingSession {
  if (session.runningSince === null) return session;
  return { ...session, runningSince: null };
}

export function currentElapsedMs(session: TrainingSession, now = Date.now()) {
  return (
    session.accumulatedMs +
    // A render can briefly hold a `now` value captured before a recovered
    // session receives its new runningSince timestamp. Never display or save
    // a negative duration during that transition.
    (session.runningSince === null
      ? 0
      : Math.max(0, now - session.runningSince))
  );
}

/** One independent timer for a structured question step. */
export type StepTimerState = {
  accumulatedMs: number;
  runningSince: number | null;
  interrupted: boolean;
};

export function startStepTimer(now = Date.now()): StepTimerState {
  return { accumulatedMs: 0, runningSince: now, interrupted: false };
}

export function pauseStepTimer(
  timer: StepTimerState,
  now = Date.now(),
): StepTimerState {
  if (timer.runningSince === null) return timer;
  return {
    ...timer,
    accumulatedMs:
      timer.accumulatedMs + Math.max(0, now - timer.runningSince),
    runningSince: null,
  };
}

export function resumeStepTimer(
  timer: StepTimerState,
  now = Date.now(),
): StepTimerState {
  if (timer.runningSince !== null) return timer;
  return { ...timer, runningSince: now };
}

export function currentStepElapsedMs(
  timer: StepTimerState,
  now = Date.now(),
): number {
  return (
    timer.accumulatedMs +
    (timer.runningSince === null
      ? 0
      : Math.max(0, now - timer.runningSince))
  );
}

/**
 * Marks a step timing sample as unreliable, for example after the page stayed
 * in the background long enough to invalidate speed statistics.
 */
export function interruptStepTimer(timer: StepTimerState): StepTimerState {
  return { ...timer, runningSince: null, interrupted: true };
}

export function finishStepTimer(
  timer: StepTimerState,
  now = Date.now(),
): { durationMs: number; timingInterrupted: boolean } {
  return {
    durationMs: currentStepElapsedMs(timer, now),
    timingInterrupted: timer.interrupted,
  };
}
