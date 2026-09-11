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
  it("keeps newly generated classic training outside the A ability model", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "two_digit_add_subtract",
      subtype: "standard",
      questionCount: 10,
      now: 10_000,
      createSessionId: () => "classic-session",
      generationContext: deterministicContext("classic"),
    });

    expect(session).toMatchObject({
      id: "classic-session",
      userId: "fish",
      questionType: "two_digit_add_subtract",
      subtype: "standard",
      questionCount: 10,
      status: "active",
      schemaVersion: 2,
      trainingMode: "legacy",
    });
    expect(session.questions).toHaveLength(10);
    expect(session.questions.every((question) => question.skillId === undefined)).toBe(
      true,
    );
    expect(session.primarySkillId).toBeUndefined();
  });

  it("creates a canonical A drill from the ability and difficulty encoded in subtype", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:A-MUL-02:L3",
      questionCount: 10,
      generationContext: deterministicContext("a-drill"),
    });

    expect(session).toMatchObject({
      questionType: "skill_drill",
      subtype: "skill:A-MUL-02:L3",
      schemaVersion: 2,
      trainingMode: "skill",
      primarySkillId: "A-MUL-02",
      difficultyBand: "L3",
    });
    expect(session.questions).toHaveLength(10);
    expect(
      session.questions.every(
        (question) =>
          question.skillId === "A-MUL-02" &&
          question.difficultyBand === "L3" &&
          question.inputKind === "choice",
      ),
    ).toBe(true);
  });

  it("keeps unfinished C task ids reserved but not executable", () => {
    expect(() =>
      createTrainingSession({
        userId: "fish",
        questionType: "skill_drill",
        subtype: "skill:C-DIV-01:L2",
        questionCount: 10,
        generationContext: deterministicContext("reserved-c"),
      }),
    ).toThrow("canonical A ability");
  });

  it("creates an independent replacement instead of retaining old progress", () => {
    const original = createTrainingSession({
      userId: "cat",
      questionType: "skill_drill",
      subtype: "skill:A-ADD-01:L2",
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

  it("preserves a frozen legacy 30-question PK set byte-for-byte", () => {
    const frozen = generateSet(
      "two_digit_add_subtract",
      "standard",
      30,
      deterministicContext("legacy"),
    );
    const pk = createTrainingSession({
      userId: "cat",
      questionType: "two_digit_add_subtract",
      subtype: "standard",
      questionCount: 30,
      questions: frozen,
      pkChallengeId: "legacy-challenge",
      createSessionId: () => "legacy-pk",
    });

    expect(pk.questions).toEqual(frozen);
    expect(pk.questions[0].skillId).toBeUndefined();
    expect(pk.questionCount).toBe(30);
    expect(pk.trainingSource).toBe("pk");
    expect(pk.trainingMode).toBe("legacy");
  });

  it("preserves a frozen canonical A question set for PK response sessions", () => {
    const source = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:A-FRA-01:L2",
      questionCount: 10,
      generationContext: deterministicContext("source-a"),
    });
    const pk = createTrainingSession({
      userId: "cat",
      questionType: source.questionType,
      subtype: source.subtype,
      questionCount: source.questionCount,
      questions: source.questions,
      pkChallengeId: "a-challenge",
      createSessionId: () => "a-pk",
    });

    expect(pk.questions).toEqual(source.questions);
    expect(pk.questions[0].skillId).toBe("A-FRA-01");
    expect(pk.questions[0].data.choiceValues).toEqual(
      source.questions[0].data.choiceValues,
    );
    expect(pk).toMatchObject({
      trainingSource: "pk",
      pkChallengeId: "a-challenge",
      primarySkillId: "A-FRA-01",
      difficultyBand: "L2",
    });
  });
});
