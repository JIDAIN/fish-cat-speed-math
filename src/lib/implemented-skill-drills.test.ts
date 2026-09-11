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

describe("implemented canonical A drills", () => {
  it("contains only the eight canonical A abilities", () => {
    expect(implementedSkillIds).toHaveLength(8);
    expect(new Set(implementedSkillIds).size).toBe(8);
    expect(isImplementedSkillId("A-PCT-01")).toBe(true);
    expect(isImplementedSkillId("A-MUL-03")).toBe(true);
    expect(isImplementedSkillId("A-PCT-02")).toBe(false);
    expect(isImplementedSkillId("B-R-03")).toBe(false);
    expect(isImplementedSkillId("C-DIVSCALE-15")).toBe(false);
  });

  it("generates all eight through one session-facing dispatcher", () => {
    for (const skillId of implementedSkillIds) {
      const questions = generateSkillDrillSet(skillId, "L2", 10, context());
      expect(questions).toHaveLength(10);
      expect(questions.every((question) => question.skillId === skillId)).toBe(
        true,
      );
    }
  });
});
