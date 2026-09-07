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
  it("combines batches 3-5 without duplicates", () => {
    expect(implementedSkillIds).toHaveLength(88);
    expect(new Set(implementedSkillIds).size).toBe(88);
    expect(isImplementedSkillId("A-PCT-02")).toBe(true);
    expect(isImplementedSkillId("B-R-03")).toBe(true);
    expect(isImplementedSkillId("B-FPSPLIT-11")).toBe(true);
    expect(isImplementedSkillId("C-DIV-09")).toBe(true);
    expect(isImplementedSkillId("C-DIVSPLIT-01")).toBe(true);
    expect(isImplementedSkillId("C-DIVSPLIT-11")).toBe(true);
    expect(isImplementedSkillId("C-DIVSCALE-01")).toBe(false);
  });

  it("routes A, B and C skill sets through one session-facing generator", () => {
    for (const skillId of [
      "A-MUL-02",
      "B-R-03",
      "B-FPSPLIT-09",
      "C-DIV-09",
      "C-DIVSPLIT-11",
    ] as const) {
      const questions = generateSkillDrillSet(skillId, "L2", 10, context());
      expect(questions).toHaveLength(10);
      expect(questions.every((question) => question.skillId === skillId)).toBe(
        true,
      );
    }
  });
});
