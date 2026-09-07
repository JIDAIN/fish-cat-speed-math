import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  generateSkillDrillSet,
  implementedSkillIds,
  isImplementedSkillId,
} from "./implemented-skill-drills";

function context(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `implemented-${id++}`,
  };
}

describe("implemented pure-computation skill drills", () => {
  it("combines batch 3 and batch 4 without duplicates", () => {
    expect(implementedSkillIds).toHaveLength(66);
    expect(new Set(implementedSkillIds).size).toBe(66);
    expect(isImplementedSkillId("A-PCT-02")).toBe(true);
    expect(isImplementedSkillId("B-R-03")).toBe(true);
    expect(isImplementedSkillId("C-DIV-09")).toBe(true);
    expect(isImplementedSkillId("C-DIVSPLIT-01")).toBe(false);
  });

  it("routes A, B and C skill sets through one session-facing generator", () => {
    for (const skillId of ["A-MUL-02", "B-R-03", "C-DIV-09"] as const) {
      const questions = generateSkillDrillSet(skillId, "L2", 10, context());
      expect(questions).toHaveLength(10);
      expect(questions.every((question) => question.skillId === skillId)).toBe(
        true,
      );
    }
  });
});
