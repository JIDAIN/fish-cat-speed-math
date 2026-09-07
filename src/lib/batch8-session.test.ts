import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import { createTrainingSession } from "./session";
import { TrainingSession } from "./types";

function context(prefix: string): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `${prefix}-${id++}`,
  };
}

function completedSkill(subtype: "skill:A-MUL-01:L2" | "skill:B-R-03:L2") {
  const session = createTrainingSession({
    userId: "fish",
    questionType: "skill_drill",
    subtype,
    questionCount: 10,
    generationContext: context(subtype),
  });
  return {
    ...session,
    currentIndex: session.questions.length,
    status: "completed" as const,
    runningSince: null,
    accumulatedMs: session.questions.length * 1_000,
    records: session.questions.map((question) => ({
      question,
      userAnswer: question.answer,
      isCorrect: true,
      accuracyLevel: "exact" as const,
      timeUsedMs: 1_000,
      restartCount: 0,
      usedScratchpad: false,
      timingInterrupted: false,
    })),
  } satisfies TrainingSession;
}

describe("batch8 session modes", () => {
  it("creates mixed training only from skills present in completed history", () => {
    const mixed = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "mixed:L2",
      questionCount: 10,
      history: [completedSkill("skill:A-MUL-01:L2"), completedSkill("skill:B-R-03:L2")],
      generationContext: context("mixed"),
    });

    expect(mixed).toMatchObject({
      trainingMode: "mixed",
      difficultyBand: "L2",
      primarySkillId: undefined,
    });
    expect(new Set(mixed.questions.map((question) => question.skillId))).toEqual(
      new Set(["A-MUL-01", "B-R-03"]),
    );
    expect(mixed.questions.every((question) => question.inputKind !== "steps")).toBe(
      true,
    );
  });

  it("creates same-question path comparison as a structured path_compare flow", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "path_compare:L3",
      questionCount: 10,
      generationContext: context("path"),
      now: 2_000,
    });

    expect(session).toMatchObject({
      trainingMode: "path_compare",
      difficultyBand: "L3",
      currentStepIndex: 0,
      currentStepAnswer: "",
    });
    expect(session.questions.every((question) => question.inputKind === "steps")).toBe(
      true,
    );
    expect(session.questions[0].stepSpecs?.map((step) => step.stepType)).toEqual([
      "path_direct",
      "path_split",
      "path_scale",
      "path_preference",
    ]);
  });
});
