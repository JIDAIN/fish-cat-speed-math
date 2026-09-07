import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  batch4SkillIds,
  generateBatch4SkillQuestion,
  generateBatch4SkillSet,
  gradeBatch4SkillQuestion,
} from "./batch4-skill-generate";
import { isRegisteredSkillId } from "./skill-registry";

function context(random = 0.42): GenerationContext {
  let id = 0;
  return {
    random: () => random,
    createId: () => `batch4-${id++}`,
  };
}

describe("stage 4 batch 4 skill generators", () => {
  it("covers every planned batch-4 skill with stable V2 metadata", () => {
    expect(batch4SkillIds).toHaveLength(33);
    for (const skillId of batch4SkillIds) {
      const generated = generateBatch4SkillQuestion(
        skillId,
        "L2",
        context(),
      );
      expect(generated).toMatchObject({
        type: "skill_drill",
        subtype: "skill_drill",
        skillId,
        difficultyBand: "L2",
      });
      expect(isRegisteredSkillId(generated.skillId)).toBe(true);
      expect(generated.structureTags).toContain(generated.primaryStructure);
      expect(generated.generatorParams?.implementationBatch).toBe(
        "stage4_batch4",
      );
    }
  });

  it.each(["L1", "L2", "L3"] as const)(
    "generates a complete 10-question B-R-07 %s set",
    (difficultyBand) => {
      const questions = generateBatch4SkillSet(
        "B-R-07",
        difficultyBand,
        10,
        context(0.37),
      );
      expect(questions).toHaveLength(10);
      expect(
        questions.every(
          (question) =>
            question.skillId === "B-R-07" &&
            question.difficultyBand === difficultyBand,
        ),
      ).toBe(true);
    },
  );

  it("keeps B-PSPLIT-01 within three basic blocks", () => {
    const generated = generateBatch4SkillQuestion(
      "B-PSPLIT-01",
      "L3",
      context(0.42),
    );
    const blocks = generated.answer.split(",").map(Number);
    expect(blocks.length).toBeLessThanOrEqual(3);
    expect(blocks.reduce((sum, block) => sum + block, 0)).toBe(
      generated.data.targetPercent,
    );
    expect(
      gradeBatch4SkillQuestion(generated, generated.answer).isCorrect,
    ).toBe(true);
  });

  it("grades semantic choice and numeric tolerance questions", () => {
    const choice = generateBatch4SkillQuestion(
      "B-R-05",
      "L2",
      context(0.31),
    );
    expect(gradeBatch4SkillQuestion(choice, choice.answer)).toEqual({
      isCorrect: true,
      accuracyLevel: "exact",
    });

    const approximate = generateBatch4SkillQuestion(
      "B-R-07",
      "L2",
      context(0.61),
    );
    const expected = Number(approximate.answer);
    expect(
      gradeBatch4SkillQuestion(approximate, String(expected + 0.2)).isCorrect,
    ).toBe(true);
  });

  it("creates standalone direct-division step drills rather than full-flow questions", () => {
    const trial = generateBatch4SkillQuestion(
      "C-DIV-06",
      "L3",
      context(0.58),
    );
    const remainder = generateBatch4SkillQuestion(
      "C-DIV-09",
      "L3",
      context(0.58),
    );
    const stop = generateBatch4SkillQuestion(
      "C-DIV-13",
      "L2",
      context(0.58),
    );

    expect(trial.primaryStructure).toBe("trial_quotient_digit");
    expect(remainder.primaryStructure).toBe("division_remainder_subtraction");
    expect(stop.inputKind).toBe("choice");
    expect(["stop", "continue"]).toContain(stop.answer);
  });
});
