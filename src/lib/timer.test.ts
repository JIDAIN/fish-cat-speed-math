import { describe, expect, it } from "vitest";
import {
  currentElapsedMs,
  pauseSessionTimer,
  resumeSessionTimer,
} from "./timer";
import { TrainingSession } from "./types";

const session = (runningSince: number | null): TrainingSession => ({
  id: "timer-session",
  userId: "fish",
  questionType: "two_digit_add_subtract",
  subtype: "standard",
  questionCount: 10,
  questions: [],
  currentIndex: 0,
  records: [],
  currentAnswer: "",
  currentRestartCount: 0,
  accumulatedMs: 2_000,
  runningSince,
  pauseDurationMs: 0,
  status: "active",
  startedAt: 0,
});

describe("session timer", () => {
  it("pauses by accumulating only the current active segment", () => {
    const paused = pauseSessionTimer(session(5_000), 8_500);
    expect(paused.accumulatedMs).toBe(5_500);
    expect(paused.runningSince).toBeNull();
  });

  it("does not count paused time when it resumes", () => {
    const resumed = resumeSessionTimer(session(null), 20_000);
    expect(resumed.accumulatedMs).toBe(2_000);
    expect(resumed.runningSince).toBe(20_000);
  });

  it("keeps completed-question time stable across multiple pause and resume cycles", () => {
    const firstPause = pauseSessionTimer(session(5_000), 8_000);
    const firstResume = resumeSessionTimer(firstPause, 20_000);
    const secondPause = pauseSessionTimer(firstResume, 22_500);
    const secondResume = resumeSessionTimer(secondPause, 50_000);

    // 2,000ms already accumulated + 3,000ms before the first pause +
    // 2,500ms before the second pause. Background gaps never count.
    expect(secondResume.accumulatedMs).toBe(7_500);
    expect(currentElapsedMs(secondResume, 54_000)).toBe(11_500);
    expect(currentElapsedMs(secondResume, 80_000)).toBe(37_500);
  });
});
