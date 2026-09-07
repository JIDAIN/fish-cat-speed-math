import { describe, expect, it } from "vitest";
import { GenerationContext, generateSet } from "./generate";
import { createTrainingSession } from "./session";

function deterministicContext(prefix: string): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `${prefix}-question-${id++}`,
  };
}

describe("createTrainingSession", () => {
  it("creates a clean schema-v2 active session and decorates newly generated questions", () => {
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
      schemaVersion: 2,
      trainingMode: "skill",
      primarySkillId: "A-ADD-01",
      difficultyBand: "L2",
    });
    expect(session.questions).toHaveLength(10);
    expect(session.questions.every((question) => question.skillId)).toBe(true);
    expect(session.questions[0]).toMatchObject({
      difficultyBand: "L2",
      targetPrecision: "exact",
      inputKind: "number",
    });
    expect(session.questions[0].generatorParams).toMatchObject({
      migrationSource: "existing_generator_v2",
      legacyQuestionType: "two_digit_add_subtract",
    });
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

  it("rejects new 30-question sessions but preserves a frozen legacy 30-question PK set", () => {
    expect(() =>
      createTrainingSession({
        userId: "fish",
        questionType: "two_digit_add_subtract",
        subtype: "standard",
        questionCount: 30,
        generationContext: deterministicContext("invalid"),
      }),
    ).toThrow(RangeError);

    const frozen = generateSet(
      "two_digit_add_subtract",
      "standard",
      30,
      deterministicContext("legacy"),
    );
    expect(frozen[0].skillId).toBeUndefined();

    const pk = createTrainingSession({
      userId: "cat",
      questionType: "two_digit_add_subtract",
      subtype: "standard",
      questionCount: 30,
      questions: frozen,
      pkChallengeId: "legacy-challenge",
      createSessionId: () => "legacy-pk",
    });
    expect(pk.questions).toHaveLength(30);
    expect(pk.questions[0].skillId).toBeUndefined();
    expect(pk.questionCount).toBe(30);
    expect(pk.trainingSource).toBe("pk");
    expect(pk.trainingMode).toBe("legacy");
  });

  it("stores explicit skill-level session metadata while generated questions also carry skill IDs", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "two_by_one_multiply",
      subtype: "standard",
      questionCount: 10,
      primarySkillId: "A-MUL-03",
      difficultyBand: "L2",
      trainingMode: "skill",
      generationContext: deterministicContext("skill"),
    });
    expect(session).toMatchObject({
      schemaVersion: 2,
      trainingMode: "skill",
      primarySkillId: "A-MUL-03",
      difficultyBand: "L2",
      questionType: "two_by_one_multiply",
    });
    expect(session.questions.every((question) => question.skillId === "A-MUL-03")).toBe(
      true,
    );
  });
});
