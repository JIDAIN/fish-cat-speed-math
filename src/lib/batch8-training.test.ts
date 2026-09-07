import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  generateMixedSkillSet,
  generatePathComparisonSet,
} from "./batch8-training";

function context(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `batch8-${id++}`,
  };
}

describe("batch8 training generators", () => {
  it("mixes only already-learned implemented non-flow skills", () => {
    const questions = generateMixedSkillSet(
      ["A-MUL-01", "B-R-03", "C-CMP-01", "C-DIVSCALE-09"],
      "L2",
      10,
      context(),
    );
    expect(questions).toHaveLength(10);
    expect(
      new Set(questions.map((question) => question.skillId)),
    ).toEqual(new Set(["A-MUL-01", "B-R-03", "C-CMP-01"]));
    expect(
      questions.every((question) =>
        question.structureTags?.includes("mixed_training"),
      ),
    ).toBe(true);
  });

  it("refuses to invent a mixed curriculum before two learned skills exist", () => {
    expect(() =>
      generateMixedSkillSet(["A-MUL-01"], "L2", 10, context()),
    ).toThrow(/至少需要先完成2个/);
  });

  it("builds same-question direct, split and scaling route steps without preselecting a best route", () => {
    const questions = generatePathComparisonSet("L3", 10, context());
    expect(questions).toHaveLength(10);
    const first = questions[0];
    expect(first).toMatchObject({
      type: "skill_drill",
      subtype: "path_compare:L3",
      inputKind: "steps",
      difficultyBand: "L3",
      targetPrecision: "3%",
      primaryStructure: "division_same_question_path_compare",
    });
    expect(first.stepSpecs?.map((step) => step.stepType)).toEqual([
      "path_direct",
      "path_split",
      "path_scale",
      "path_preference",
    ]);
    const preference = first.stepSpecs?.at(-1);
    expect(preference?.allowedAnswerSet).toEqual([
      "direct",
      "split",
      "scale",
    ]);
    expect(first.stepSpecs?.slice(0, 3).every((step) => step.acceptedRange)).toBe(
      true,
    );
  });
});
