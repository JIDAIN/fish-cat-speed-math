import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  batch6DivisionScaleSkillIds,
  generateBatch6DivisionScaleQuestion,
  generateBatch6DivisionScaleSet,
  gradeBatch6DivisionScaleQuestion,
} from "./batch6-division-scale-generate";

function context(randomValue = 0.42): GenerationContext {
  let id = 0;
  return {
    random: () => randomValue,
    createId: () => `scale-${id++}`,
  };
}

describe("stage4 batch6 division compensation scaling", () => {
  it("generates all 15 C-DIVSCALE skills with V2 metadata", () => {
    expect(batch6DivisionScaleSkillIds).toHaveLength(15);
    for (const skillId of batch6DivisionScaleSkillIds) {
      const generated = generateBatch6DivisionScaleQuestion(
        skillId,
        skillId === "C-DIVSCALE-04" ? "L2" : "L3",
        context(),
      );
      expect(generated).toMatchObject({
        type: "skill_drill",
        subtype: "skill_drill",
        skillId,
        generationRuleVersion: "stage4-batch6-1.0.0",
      });
      expect(generated.generatorParams).toMatchObject({
        generatorFamily: "division_compensation_scaling",
        implementationBatch: "stage4_batch6",
      });
    }
  });

  it("uses the C7 result-side definition r=|D-B|/B", () => {
    const generated = generateBatch6DivisionScaleQuestion(
      "C-DIVSCALE-09",
      "L2",
      context(),
    );
    const denominator = Number(generated.data.denominator);
    const base = Number(generated.data.base);
    const storedPercent = Number(generated.data.rPercent);
    expect(storedPercent).toBeCloseTo((Math.abs(denominator - base) / base) * 100);
    expect(Number(generated.answer)).toBeCloseTo(storedPercent, 2);
  });

  it("turns L3 compensation-position training into a real structured flow", () => {
    const generated = generateBatch6DivisionScaleQuestion(
      "C-DIVSCALE-04",
      "L3",
      context(),
    );
    expect(generated.inputKind).toBe("steps");
    expect(generated.stepSpecs?.length).toBeGreaterThanOrEqual(7);
    expect(generated.stepSpecs?.map((step) => step.stepSkillId)).toEqual(
      expect.arrayContaining([
        "C-DIVSCALE-02",
        "C-DIVSCALE-03",
        "C-DIVSCALE-04",
      ]),
    );
    expect(generated.generatorParams?.route).toBeTruthy();
  });

  it("keeps second order as an explicit low-frequency decision", () => {
    const generated = generateBatch6DivisionScaleQuestion(
      "C-DIVSCALE-13",
      "L3",
      context(),
    );
    const rPercent = Number(generated.data.rPercent);
    const residual = Number(generated.data.firstResidualPercent);
    expect(residual).toBeCloseTo((rPercent * rPercent) / 100);
    expect(["yes", "no"]).toContain(generated.answer);
  });

  it("uses the obvious-multiple linear correction identity without second order", () => {
    const generated = generateBatch6DivisionScaleQuestion(
      "C-DIVSCALE-15",
      "L2",
      context(),
    );
    const numerator = Number(generated.data.numerator);
    const denominator = Number(generated.data.denominator);
    const result = Number(generated.data.result);
    expect(result).toBeCloseTo(numerator / denominator, 10);
    expect(generated.structureTags).toContain(
      "division_scale_obvious_multiple_linear_correction",
    );
  });

  it("accepts configured approximate numeric answers", () => {
    const generated = generateBatch6DivisionScaleQuestion(
      "C-DIVSCALE-09",
      "L3",
      context(),
    );
    const midpoint =
      ((generated.acceptedRange?.min ?? 0) +
        (generated.acceptedRange?.max ?? 0)) /
      2;
    expect(gradeBatch6DivisionScaleQuestion(generated, String(midpoint))).toMatchObject({
      isCorrect: true,
    });
    expect(gradeBatch6DivisionScaleQuestion(generated, "9999")).toMatchObject({
      isCorrect: false,
    });
  });

  it("creates complete 10-question sets", () => {
    const generated = generateBatch6DivisionScaleSet(
      "C-DIVSCALE-12",
      "L2",
      10,
      context(),
    );
    expect(generated).toHaveLength(10);
    expect(generated.every((item) => item.skillId === "C-DIVSCALE-12")).toBe(
      true,
    );
  });
});
