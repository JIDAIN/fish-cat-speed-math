import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import { createTrainingSession } from "./session";
import { submitCurrentStep } from "./training";

function context(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `batch6-${id++}`,
  };
}

describe("batch6 structured division compensation flow", () => {
  it("creates L3 compensation-position sessions as flow training with step timers", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:C-DIVSCALE-04:L3",
      questionCount: 10,
      now: 1_000,
      generationContext: context(),
      createSessionId: () => "scale-flow",
    });

    expect(session).toMatchObject({
      id: "scale-flow",
      trainingMode: "flow",
      primarySkillId: "C-DIVSCALE-04",
      difficultyBand: "L3",
      currentStepIndex: 0,
      currentStepAnswer: "",
    });
    expect(session.currentStepTimer?.runningSince).toBe(1_000);
    expect(session.questions.every((question) => question.inputKind === "steps")).toBe(
      true,
    );
    expect(session.questions[0].stepSpecs?.map((step) => step.stepSkillId)).toEqual(
      expect.arrayContaining([
        "C-DIVSCALE-02",
        "C-DIVSCALE-03",
        "C-DIVSCALE-04",
      ]),
    );
  });

  it("records a submitted compensation step under its own skill id", () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:C-DIVSCALE-04:L3",
      questionCount: 10,
      now: 1_000,
      generationContext: context(),
    });
    const firstStep = session.questions[0].stepSpecs?.[0];
    if (!firstStep?.expectedValue) throw new Error("missing first step");
    const withAnswer = {
      ...session,
      currentStepAnswer: String(firstStep.expectedValue),
    };
    const next = submitCurrentStep(withAnswer, 1_500, false, 1_500);
    expect(next.currentStepIndex).toBe(1);
    expect(next.currentStepRecords?.[0]).toMatchObject({
      stepSkillId: "C-DIVSCALE-02",
      isCorrect: true,
      durationMs: 500,
    });
  });
});
