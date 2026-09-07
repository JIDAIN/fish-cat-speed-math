import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import { createTrainingSession } from "./session";
import { submitCurrentStep } from "./training";

function context(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `flow-${id++}`,
  };
}

describe("batch 5 structured division split flow", () => {
  it("records every step independently and advances to the next flow question", () => {
    let now = 1_000;
    let session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:C-DIVSPLIT-11:L2",
      questionCount: 10,
      now,
      generationContext: context(),
      createSessionId: () => "split-flow",
    });

    expect(session).toMatchObject({
      trainingMode: "flow",
      primarySkillId: "C-DIVSPLIT-11",
      currentStepIndex: 0,
      currentStepAnswer: "",
      currentStepRecords: [],
    });
    expect(session.currentStepTimer?.runningSince).toBe(1_000);

    const first = session.questions[0];
    const steps = first.stepSpecs ?? [];
    expect(steps.length).toBeGreaterThanOrEqual(10);

    for (const step of steps) {
      now += 500;
      session = {
        ...session,
        currentStepAnswer: String(step.expectedValue),
        currentStepEditCount: 1,
      };
      session = submitCurrentStep(session, now - 1_000, false, now);
    }

    expect(session.currentIndex).toBe(1);
    expect(session.records).toHaveLength(1);
    expect(session.records[0].isCorrect).toBe(true);
    expect(session.records[0].steps).toHaveLength(steps.length);
    expect(session.records[0].steps?.every((step) => step.durationMs === 500)).toBe(
      true,
    );
    expect(session.records[0].steps?.every((step) => step.stepSkillId)).toBe(true);
    expect(session.currentStepIndex).toBe(0);
    expect(session.currentStepRecords).toEqual([]);
    expect(session.currentStepTimer?.runningSince).toBe(now);
  });

  it("keeps an early wrong step in diagnostics even when the final value is correct", () => {
    let now = 5_000;
    let session = createTrainingSession({
      userId: "cat",
      questionType: "skill_drill",
      subtype: "skill:C-DIVSPLIT-11:L1",
      questionCount: 10,
      now,
      generationContext: context(),
    });
    const steps = session.questions[0].stepSpecs ?? [];

    steps.forEach((step, index) => {
      now += 200;
      session = {
        ...session,
        currentStepAnswer:
          index === 0 ? "unsuitable" : String(step.expectedValue),
      };
      session = submitCurrentStep(session, now - 5_000, false, now);
    });

    expect(session.records[0].userAnswer).toBe(session.questions[0].answer);
    expect(session.records[0].isCorrect).toBe(false);
    expect(session.records[0].steps?.[0].isCorrect).toBe(false);
    expect(session.records[0].steps?.at(-1)?.isCorrect).toBe(true);
  });
});
