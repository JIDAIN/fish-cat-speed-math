import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  batch5SplitSkillIds,
  generateBatch5SplitQuestion,
  generateBatch5SplitSet,
  gradeBatch5SplitQuestion,
} from "./batch5-split-generate";
import { isRegisteredSkillId } from "./skill-registry";

function context(random = 0.42): GenerationContext {
  let id = 0;
  return {
    random: () => random,
    createId: () => `batch5-${id++}`,
  };
}

describe("stage 4 batch 5 division split generators", () => {
  it("covers all 22 B6/C5 abilities with V2 metadata", () => {
    expect(batch5SplitSkillIds).toHaveLength(22);
    for (const skillId of batch5SplitSkillIds) {
      const generated = generateBatch5SplitQuestion(skillId, "L2", context());
      expect(generated).toMatchObject({
        type: "skill_drill",
        subtype: "skill_drill",
        skillId,
        difficultyBand: "L2",
      });
      expect(isRegisteredSkillId(generated.skillId)).toBe(true);
      expect(generated.generatorParams?.implementationBatch).toBe(
        "stage4_batch5",
      );
    }
  });

  it.each(["L1", "L2", "L3"] as const)(
    "generates complete C-DIVSPLIT-11 %s flow sets",
    (difficultyBand) => {
      const questions = generateBatch5SplitSet(
        "C-DIVSPLIT-11",
        difficultyBand,
        10,
        context(0.37),
      );
      expect(questions).toHaveLength(10);
      expect(
        questions.every(
          (question) =>
            question.inputKind === "steps" &&
            question.stepSpecs &&
            question.stepSpecs.length >= 10 &&
            question.stepSpecs.at(-1)?.stepSkillId === "C-DIVSPLIT-11",
        ),
      ).toBe(true);
    },
  );

  it("keeps B-FPSPLIT-09 within the specified 2-4 block range", () => {
    for (const difficultyBand of ["L1", "L2", "L3"] as const) {
      const generated = generateBatch5SplitQuestion(
        "B-FPSPLIT-09",
        difficultyBand,
        context(0.61),
      );
      const blocks = generated.answer.split(",").map(Number);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      expect(blocks.length).toBeLessThanOrEqual(4);
      expect(blocks.reduce((sum, value) => sum + value, 0)).toBe(
        generated.data.targetPercent,
      );
      expect(gradeBatch5SplitQuestion(generated, generated.answer).isCorrect).toBe(
        true,
      );
    }
  });

  it("generates a full flow whose final answer matches its canonical blocks", () => {
    const generated = generateBatch5SplitQuestion(
      "C-DIVSPLIT-11",
      "L3",
      context(0.58),
    );
    const blocks = generated.data.canonicalBlocks as number[];
    const total = blocks.reduce((sum, value) => sum + value, 0);
    expect(Number(generated.answer)).toBe(total);
    expect(generated.stepSpecs?.[0]).toMatchObject({
      stepSkillId: "C-DIVSPLIT-01",
      inputKind: "choice",
    });
    expect(generated.stepSpecs?.some((step) => step.stepSkillId === "C-DIVSPLIT-04")).toBe(
      true,
    );
    expect(generated.stepSpecs?.at(-2)).toMatchObject({
      stepSkillId: "C-DIVSPLIT-10",
      expectedValue: "stop",
    });
  });
});
