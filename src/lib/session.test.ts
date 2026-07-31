import { describe, expect, it } from "vitest";
import { restartCurrentQuestion } from "./session";
import { TrainingSession } from "./types";

const session: TrainingSession = {
  id: "restart-session",
  userId: "fish",
  questionType: "two_digit_add_subtract",
  subtype: "standard",
  questionCount: 10,
  questions: [],
  currentIndex: 1,
  records: [
    {
      question: {} as TrainingSession["questions"][number],
      userAnswer: "12",
      isCorrect: true,
      accuracyLevel: "exact",
      timeUsedMs: 2_500,
      restartCount: 0,
      usedScratchpad: false,
    },
  ],
  currentAnswer: "123",
  currentRestartCount: 1,
  accumulatedMs: 7_000,
  runningSince: 5_000,
  pauseDurationMs: 0,
  status: "active",
  startedAt: 0,
};

describe("restartCurrentQuestion", () => {
  it("discards the current question time and records the restart", () => {
    const restarted = restartCurrentQuestion(session, 10_000);

    expect(restarted.currentAnswer).toBe("");
    expect(restarted.currentRestartCount).toBe(2);
    expect(restarted.accumulatedMs).toBe(2_500);
    expect(restarted.runningSince).toBe(10_000);
  });

  it("increments again without changing completed-question time", () => {
    const once = restartCurrentQuestion(session, 10_000);
    const twice = restartCurrentQuestion(once, 12_000);

    expect(twice.currentRestartCount).toBe(3);
    expect(twice.accumulatedMs).toBe(2_500);
    expect(twice.currentAnswer).toBe("");
    expect(twice.runningSince).toBe(12_000);
  });
});
