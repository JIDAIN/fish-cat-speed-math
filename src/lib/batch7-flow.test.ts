import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import { createTrainingSession } from "./session";
import { submitCurrentStep } from "./training";

function context(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `batch7-flow-${id++}`,
  };
}

describe("batch7 cross-operation compensation flow", () => {
  it("creates multiplication reverse compensation as real flow training", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:C-XP-SCALE-03:L3",
      questionCount: 10,
      now: 1_000,
      generationContext: context(),
      createSessionId: () => "xp-scale-flow",
    });

    expect(session).toMatchObject({
      id: "xp-scale-flow",
      trainingMode: "flow",
      primarySkillId: "C-XP-SCALE-03",
      difficultyBand: "L3",
      currentStepIndex: 0,
      currentStepAnswer: "",
    });
    expect(session.currentStepTimer?.runningSince).toBe(1_000);
    expect(session.questions.every((question) => question.inputKind === "steps")).toBe(
      true,
    );
    expect(session.questions[0].stepSpecs?.map((step) => step.stepSkillId)).toEqual([
      "B-BASE-01",
      "C-XP-SCALE-03",
      "C-XP-SCALE-03",
    ]);
  });

  it("records all three compensation steps and advances to the next question", () => {
    let session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:C-XP-SCALE-01:L2",
      questionCount: 10,
      now: 1_000,
      generationContext: context(),
    });
    const specs = session.questions[0].stepSpecs;
    if (!specs?.length) throw new Error("missing batch7 step specs");

    for (let index = 0; index < specs.length; index += 1) {
      const expected = specs[index].expectedValue;
      if (expected === undefined) throw new Error("missing expected step value");
      session = submitCurrentStep(
        { ...session, currentStepAnswer: String(expected) },
        1_500 + index * 500,
        false,
        1_500 + index * 500,
      );
    }

    expect(session.currentIndex).toBe(1);
    expect(session.records).toHaveLength(1);
    expect(session.records[0]).toMatchObject({
      isCorrect: true,
      timeUsedMs: 1_500,
    });
    expect(session.records[0].steps).toHaveLength(3);
    expect(session.records[0].steps?.every((step) => step.isCorrect)).toBe(true);
  });
});
