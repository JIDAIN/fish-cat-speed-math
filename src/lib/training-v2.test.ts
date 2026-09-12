import { describe, expect, it } from "vitest";
import { createStepRecord } from "./training";

describe("v2 step record", () => {
  it("normalizes one structured method step into the shared diagnostic shape", () => {
    const record = createStepRecord({
      spec: {
        id: "choose-baseline",
        stepType: "baseline_choice",
        prompt: "选择基准",
        inputKind: "choice",
        expectedValue: 200,
      },
      userValue: 200,
      decisionValue: "200",
      isCorrect: true,
      durationMs: 1200,
      editCount: 1,
    });

    expect(record).toEqual({
      stepId: "choose-baseline",
      stepType: "baseline_choice",
      userValue: 200,
      expectedValue: 200,
      decisionValue: "200",
      isCorrect: true,
      durationMs: 1200,
      submitCount: 1,
      editCount: 1,
      skipped: false,
      timingInterrupted: false,
    });
  });

  it("never stores a negative step duration", () => {
    expect(
      createStepRecord({
        spec: {
          id: "x",
          stepType: "numeric",
          prompt: "x",
          inputKind: "number",
        },
        isCorrect: false,
        durationMs: -1,
      }).durationMs,
    ).toBe(0);
  });
});
