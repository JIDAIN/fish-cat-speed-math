import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  generateStabilizationSkillQuestion,
  stabilizationSkillIds,
} from "./stabilization-skill-generate";
import { DifficultyBand } from "./types";

function context(seed = 1): GenerationContext {
  let state = seed >>> 0;
  let id = 0;
  return {
    random: () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    },
    createId: () => `stabilize-${seed}-${id++}`,
  };
}

describe("layer-1 stabilization skill generators", () => {
  it("covers the 20 formerly non-direct skills in every difficulty band", () => {
    const bands: DifficultyBand[] = ["L1", "L2", "L3"];
    expect(stabilizationSkillIds).toHaveLength(20);
    stabilizationSkillIds.forEach((skillId, skillIndex) => {
      bands.forEach((band, bandIndex) => {
        const generated = generateStabilizationSkillQuestion(
          skillId,
          band,
          context(100 + skillIndex * 10 + bandIndex),
        );
        expect(generated.skillId).toBe(skillId);
        expect(generated.difficultyBand).toBe(band);
        expect(generated.masteryProfile).toBeTruthy();
        expect(generated.inputKind).toBeTruthy();
        expect(generated.generationRuleVersion).toBe("layer1-stabilization-1.0.0");
      });
    });
  });

  it("keeps the dedicated multiplication carry structures distinct", () => {
    const noCarry = generateStabilizationSkillQuestion("A-MUL-04", "L2", context(201));
    const onesCarry = generateStabilizationSkillQuestion("A-MUL-05", "L2", context(202));
    const middleCarry = generateStabilizationSkillQuestion("A-MUL-06", "L2", context(203));
    const multiCarry = generateStabilizationSkillQuestion("A-MUL-07", "L2", context(204));
    expect(noCarry.primaryStructure).toBe("two_by_two_no_complex_carry");
    expect(onesCarry.data.onesCarry).toBe(true);
    expect(onesCarry.data.middleCarry).toBe(false);
    expect(middleCarry.data.onesCarry).toBe(false);
    expect(middleCarry.data.middleCarry).toBe(true);
    expect(Number(multiCarry.data.carryCount)).toBeGreaterThanOrEqual(2);
  });

  it("emits the required borrow-specific subtraction structures", () => {
    const single = generateStabilizationSkillQuestion("A-SUB-02", "L2", context(301));
    const consecutive = generateStabilizationSkillQuestion("A-SUB-03", "L2", context(302));
    const crossZero = generateStabilizationSkillQuestion("A-SUB-04", "L2", context(303));
    const mixed = generateStabilizationSkillQuestion("A-SUB-05", "L3", context(304));
    expect(single.data.borrowCount).toBe(1);
    expect(Number(consecutive.data.maxConsecutiveBorrow)).toBeGreaterThanOrEqual(2);
    expect(crossZero.primaryStructure).toBe("borrow_across_zero");
    expect(Number(mixed.data.borrowCount)).toBeGreaterThanOrEqual(2);
  });

  it("turns C-DIV-04 into a real structured full-flow drill", () => {
    const generated = generateStabilizationSkillQuestion("C-DIV-04", "L3", context(401));
    expect(generated.inputKind).toBe("steps");
    expect(generated.stepSpecs?.map((step) => step.stepSkillId)).toEqual([
      "C-DIV-05",
      "C-DIV-06",
      expect.stringMatching(/^C-DIV-0[678]$/),
      "C-DIV-09",
      "C-DIV-12",
      "C-DIV-13",
    ]);
    expect(generated.targetPrecision).toBe("3%");
  });
});
