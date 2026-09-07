import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import { createTrainingSession } from "./session";
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

function deterministicContext(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `batch4-submit-${id++}`,
  };
}

describe("submitCurrentAnswer", () => {
  it("records the answer once and carries the restart count into history", () => {
    const completed = submitCurrentAnswer(session(), 3_000, true, 7_000);

    expect(completed.status).toBe("completed");
    expect(completed.records).toHaveLength(1);
    expect(completed.records[0]).toMatchObject({
      restartCount: 2,
      timeUsedMs: 3_000,
      usedScratchpad: true,
    });
    expect(completed.completedAt).toBe(7_000);
  });

  it("grades a batch-4 semantic choice after its temporary numeric UI encoding", () => {
    const drill = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:B-R-05:L2",
      questionCount: 10,
      generationContext: deterministicContext(),
    });
    const current = drill.questions[0];
    const answered = {
      ...drill,
      questions: [current],
      questionCount: 1,
      currentAnswer: current.answer,
    };

    const completed = submitCurrentAnswer(answered, 1_500, false, 2_000);
    expect(completed.status).toBe("completed");
    expect(completed.records[0]).toMatchObject({
      isCorrect: true,
      accuracyLevel: "exact",
      userAnswer: current.answer,
    });
    expect(completed.records[0].question.generatorParams).toMatchObject({
      semanticInputKind: "choice",
      uiAdapter: "choice_numeric_code_v1",
    });
  });

  it("does not add a duplicate record when submit is invoked again", () => {
    const completed = submitCurrentAnswer(session(), 3_000, false, 7_000);
    const repeated = submitCurrentAnswer(completed, 3_000, false, 9_000);

    expect(repeated.records).toHaveLength(1);
    expect(repeated.completedAt).toBe(7_000);
  });

  it("does not submit an empty answer or a session that is no longer active", () => {
    const empty = session({ currentAnswer: "" });
    expect(submitCurrentAnswer(empty, 1_000, false)).toBe(empty);

    const inactive = session({ status: "abandoned" });
    expect(submitCurrentAnswer(inactive, 1_000, false)).toBe(inactive);
  });
});
