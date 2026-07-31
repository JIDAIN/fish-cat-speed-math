import { describe, expect, it } from "vitest";
import { submitCurrentAnswer } from "./training";
import { GeneratedQuestion, TrainingSession } from "./types";

const question: GeneratedQuestion = {
  id: "q1",
  type: "two_digit_add_subtract",
  subtype: "standard",
  prompt: "12+3",
  answer: "15",
  data: {},
  difficulty: { level: 3, tags: [] },
  primaryStructure: "test_structure",
  secondaryTags: [],
  generationRuleVersion: "test",
};

function session(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: "training",
    userId: "fish",
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: 10,
    questions: [question],
    currentIndex: 0,
    records: [],
    currentAnswer: "15",
    currentRestartCount: 2,
    accumulatedMs: 0,
    runningSince: 0,
    pauseDurationMs: 0,
    status: "active",
    startedAt: 0,
    ...overrides,
  };
}

describe("submitCurrentAnswer", () => {
  it("records the answer once and carries the restart count into history", () => {
    const completed = submitCurrentAnswer(session(), 3_000, true);

    expect(completed.status).toBe("completed");
    expect(completed.records).toHaveLength(1);
    expect(completed.records[0]).toMatchObject({
      restartCount: 2,
      timeUsedMs: 3_000,
      usedScratchpad: true,
    });
  });

  it("does not add a duplicate record when submit is invoked again", () => {
    const completed = submitCurrentAnswer(session(), 3_000, false);
    const repeated = submitCurrentAnswer(completed, 3_000, false);

    expect(repeated.records).toHaveLength(1);
  });

  it("does not submit an empty answer or a session that is no longer active", () => {
    const empty = session({ currentAnswer: "" });
    expect(submitCurrentAnswer(empty, 1_000, false)).toBe(empty);

    const inactive = session({ status: "abandoned" });
    expect(submitCurrentAnswer(inactive, 1_000, false)).toBe(inactive);
  });
});
