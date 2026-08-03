import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import { createTrainingSession } from "./session";

function deterministicContext(prefix: string): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `${prefix}-question-${id++}`,
  };
}

describe("createTrainingSession", () => {
  it("creates a clean active session with the requested frozen settings", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "two_digit_add_subtract",
      subtype: "standard",
      questionCount: 10,
      now: 10_000,
      createSessionId: () => "fresh-session",
      generationContext: deterministicContext("fresh"),
    });

    expect(session).toMatchObject({
      id: "fresh-session",
      userId: "fish",
      questionType: "two_digit_add_subtract",
      subtype: "standard",
      questionCount: 10,
      currentIndex: 0,
      records: [],
      currentAnswer: "",
      currentRestartCount: 0,
      accumulatedMs: 0,
      runningSince: 10_000,
      pauseDurationMs: 0,
      status: "active",
      startedAt: 10_000,
    });
    expect(session.questions).toHaveLength(10);
  });

  it("creates an independent replacement instead of retaining old progress", () => {
    const original = createTrainingSession({
      userId: "cat",
      questionType: "three_digit_add_subtract",
      subtype: "standard",
      questionCount: 20,
      now: 1_000,
      createSessionId: () => "old-session",
      generationContext: deterministicContext("old"),
    });
    original.currentIndex = 4;
    original.currentAnswer = "123";
    original.currentRestartCount = 3;
    original.accumulatedMs = 8_000;

    const replacement = createTrainingSession({
      userId: original.userId,
      questionType: original.questionType,
      subtype: original.subtype,
      questionCount: original.questionCount,
      now: 20_000,
      createSessionId: () => "new-session",
      generationContext: deterministicContext("new"),
    });

    expect(replacement.id).toBe("new-session");
    expect(replacement.questions[0].id).not.toBe(original.questions[0].id);
    expect(replacement).toMatchObject({
      currentIndex: 0,
      records: [],
      currentAnswer: "",
      currentRestartCount: 0,
      accumulatedMs: 0,
      runningSince: 20_000,
    });
  });
});
