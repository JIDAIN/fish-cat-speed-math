import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  foundationSkillIds,
  generateFoundationSkillQuestion,
  generateFoundationSkillSet,
  gradeFoundationSkillQuestion,
} from "./skill-generate";
import { isRegisteredSkillId } from "./skill-registry";

function context(random = 0.42): GenerationContext {
  let id = 0;
  return {
    random: () => random,
    createId: () => `foundation-${id++}`,
  };
}

describe("A-layer foundation skill generators", () => {
  it("covers every batch-3 foundation skill with stable V2 metadata", () => {
    expect(foundationSkillIds).toHaveLength(33);
    for (const skillId of foundationSkillIds) {
      const generated = generateFoundationSkillQuestion(
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
      expect(generated.masteryProfile).toBeTruthy();
      expect(generated.generatorParams).toMatchObject({
        generatorFamily: "a_foundation",
      });
    }
  });

  it.each(["L1", "L2", "L3"] as const)(
    "generates a full 10-question %s set without losing the selected skill",
    (difficultyBand) => {
      const questions = generateFoundationSkillSet(
        "A-PCT-04",
        difficultyBand,
        10,
        context(0.37),
      );
      expect(questions).toHaveLength(10);
      expect(
        questions.every(
          (question) =>
            question.skillId === "A-PCT-04" &&
            question.difficultyBand === difficultyBand,
        ),
      ).toBe(true);
    },
  );

  it("accepts the configured tolerance without treating an approximate answer as exact", () => {
    const generated = generateFoundationSkillQuestion(
      "A-SPM-04",
      "L2",
      context(),
    );
    const expected = Number(generated.answer);
    const accepted = gradeFoundationSkillQuestion(
      generated,
      String(expected + 0.05),
    );
    expect(accepted).toEqual({ isCorrect: true, accuracyLevel: "accepted" });
    expect(
      gradeFoundationSkillQuestion(generated, String(expected + 1)).isCorrect,
    ).toBe(false);
  });

  it("keeps percentage-block tolerance at the wider of 0.5% relative or 0.1 absolute", () => {
    const generated = generateFoundationSkillQuestion(
      "A-PCT-05",
      "L2",
      context(0.61),
    );
    const expected = Number(generated.answer);
    const inside = generated.acceptedRange?.max;
    expect(inside).toBeTypeOf("number");
    expect(
      gradeFoundationSkillQuestion(generated, String(expected)).accuracyLevel,
    ).toBe("exact");
    expect(
      gradeFoundationSkillQuestion(generated, String(inside)).isCorrect,
    ).toBe(true);
  });

  it("generates the magnitude drill as a bounded category decision", () => {
    const generated = generateFoundationSkillQuestion(
      "A-PLACE-05",
      "L3",
      context(0.77),
    );
    expect(generated.inputKind).toBe("choice");
    expect(generated.targetPrecision).toBe("magnitude");
    expect(generated.data.choiceValues).toEqual(["个", "十", "百", "千", "万"]);
    expect(generated.allowedAnswerSet).toEqual([generated.answer]);
  });
});
