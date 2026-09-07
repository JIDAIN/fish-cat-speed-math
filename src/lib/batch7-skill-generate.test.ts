import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  batch7SkillIds,
  generateBatch7SkillQuestion,
  generateBatch7SkillSet,
  gradeBatch7SkillQuestion,
  isBatch7SkillId,
} from "./batch7-skill-generate";

function context(seed = 0.37): GenerationContext {
  let id = 0;
  let state = Math.floor(seed * 1_000_000) || 1;
  return {
    random: () => {
      state = (state * 48271) % 2147483647;
      return state / 2147483647;
    },
    createId: () => `batch7-${id++}`,
  };
}

describe("stage 4 batch 7 remaining B/C generators", () => {
  it("registers exactly the 37 planned batch-7 skill ids", () => {
    expect(batch7SkillIds).toHaveLength(37);
    expect(new Set(batch7SkillIds).size).toBe(37);
    expect(isBatch7SkillId("B-ORDER-01")).toBe(true);
    expect(isBatch7SkillId("B-CONV-02")).toBe(true);
    expect(isBatch7SkillId("C-EST-11")).toBe(true);
    expect(isBatch7SkillId("C-XP-SCALE-03")).toBe(true);
    expect(isBatch7SkillId("C-CMP-06")).toBe(true);
    expect(isBatch7SkillId("C-DIVSCALE-15")).toBe(false);
  });

  it("generates every batch-7 skill at L1/L2/L3 and its own grader accepts the canonical answer", () => {
    for (const difficultyBand of ["L1", "L2", "L3"] as const) {
      for (const skillId of batch7SkillIds) {
        const generated = generateBatch7SkillQuestion(
          skillId,
          difficultyBand,
          context((skillId.length + difficultyBand.length) / 100),
        );
        expect(generated).toMatchObject({
          type: "skill_drill",
          subtype: "skill_drill",
          skillId,
          difficultyBand,
        });
        expect(generated.structureTags).toContain(difficultyBand.toLowerCase());
        expect(generated.generatorParams).toMatchObject({
          implementationBatch: "stage4_batch7",
        });
        expect(gradeBatch7SkillQuestion(generated, generated.answer).isCorrect).toBe(
          true,
        );
      }
    }
  });

  it("keeps B-ORDER as semantic sequence tasks before the session UI adapter", () => {
    for (const skillId of [
      "B-ORDER-01",
      "B-ORDER-02",
      "B-ORDER-03",
      "B-ORDER-04",
      "B-ORDER-05",
      "B-ORDER-06",
    ] as const) {
      const generated = generateBatch7SkillQuestion(skillId, "L2", context());
      expect(generated.inputKind).toBe("sequence");
      expect(generated.data.choiceValues).toBeTruthy();
      expect(generated.data.choiceLabels).toBeTruthy();
      expect(generated.allowedAnswerSet?.length).toBeGreaterThan(0);
    }
  });

  it("builds all three cross-operation compensation drills as real structured step flows", () => {
    for (const skillId of [
      "C-XP-SCALE-01",
      "C-XP-SCALE-02",
      "C-XP-SCALE-03",
    ] as const) {
      const generated = generateBatch7SkillQuestion(skillId, "L3", context());
      expect(generated.inputKind).toBe("steps");
      expect(generated.stepSpecs?.length).toBe(3);
      expect(generated.stepSpecs?.every((step) => step.stepSkillId)).toBe(true);
      expect(generated.stepSpecs?.at(-1)?.expectedValue).toBe(generated.answer);
    }
  });

  it("creates stable ten-question sets for a decision drill and a numeric drill", () => {
    const decision = generateBatch7SkillSet("C-EST-10", "L2", 10, context(0.21));
    const numeric = generateBatch7SkillSet("C-ADD-01", "L3", 10, context(0.63));
    expect(decision).toHaveLength(10);
    expect(numeric).toHaveLength(10);
    expect(decision.every((item) => item.skillId === "C-EST-10")).toBe(true);
    expect(numeric.every((item) => item.skillId === "C-ADD-01")).toBe(true);
  });
});
