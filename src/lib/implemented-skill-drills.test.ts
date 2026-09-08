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
  it("combines the complete 160-skill registry without duplicates", () => {
    expect(implementedSkillIds).toHaveLength(160);
    expect(new Set(implementedSkillIds).size).toBe(160);
    expect(isImplementedSkillId("A-PCT-02")).toBe(true);
    expect(isImplementedSkillId("A-SUB-04")).toBe(true);
    expect(isImplementedSkillId("A-FRA-03")).toBe(true);
    expect(isImplementedSkillId("B-R-03")).toBe(true);
    expect(isImplementedSkillId("B-FPSPLIT-11")).toBe(true);
    expect(isImplementedSkillId("B-ORDER-01")).toBe(true);
    expect(isImplementedSkillId("B-CONV-02")).toBe(true);
    expect(isImplementedSkillId("C-MUL-01")).toBe(true);
    expect(isImplementedSkillId("C-DIV-04")).toBe(true);
    expect(isImplementedSkillId("C-DIVSPLIT-11")).toBe(true);
    expect(isImplementedSkillId("C-DIVSCALE-15")).toBe(true);
    expect(isImplementedSkillId("C-EST-11")).toBe(true);
    expect(isImplementedSkillId("C-XP-SCALE-01")).toBe(true);
    expect(isImplementedSkillId("C-CMP-06")).toBe(true);
  });

  it("routes A, B and C skill sets through one session-facing generator", () => {
    for (const skillId of [
      "A-MUL-02",
      "A-SUB-04",
      "A-FRA-03",
      "B-R-03",
      "B-FPSPLIT-09",
      "B-ORDER-06",
      "C-MUL-01",
      "C-DIV-04",
      "C-DIV-09",
      "C-DIVSPLIT-11",
      "C-DIVSCALE-09",
      "C-EST-10",
      "C-XP-SCALE-01",
    ] as const) {
      const questions = generateSkillDrillSet(skillId, "L2", 10, context());
      expect(questions).toHaveLength(10);
      expect(questions.every((question) => question.skillId === skillId)).toBe(
        true,
      );
    }
  });
});
