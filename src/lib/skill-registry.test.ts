import { describe, expect, it } from "vitest";
import {
  getSkillDefinition,
  isRegisteredSkillId,
  PURE_COMPUTATION_SKILL_COUNT,
  skillDefinitions,
  skillsForLayer,
} from "./skill-registry";

describe("pure computation skill registry", () => {
  it("registers every frozen V1 leaf exactly once", () => {
    expect(skillDefinitions).toHaveLength(PURE_COMPUTATION_SKILL_COUNT);
    expect(new Set(skillDefinitions.map((skill) => skill.id)).size).toBe(
      PURE_COMPUTATION_SKILL_COUNT,
    );
    expect(skillsForLayer("A")).toHaveLength(48);
    expect(skillsForLayer("B")).toHaveLength(49);
    expect(skillsForLayer("C")).toHaveLength(63);
  });

  it("resolves representative skills across all three layers", () => {
    expect(getSkillDefinition("A-MUL-02")).toMatchObject({
      displayName: "逆向乘法口诀",
      masteryProfile: "R",
      layer: "A",
    });
    expect(getSkillDefinition("B-R-03")).toMatchObject({
      displayName: "差值÷基准",
      masteryProfile: "C",
      layer: "B",
    });
    expect(getSkillDefinition("C-DIVSPLIT-11")).toMatchObject({
      displayName: "完整拆分流程",
      masteryProfile: "F",
      layer: "C",
    });
    expect(getSkillDefinition("C-DIVSCALE-04")).toMatchObject({
      displayName: "补偿位置选择",
      masteryProfile: "D",
    });
  });

  it("does not accept arbitrary A/B/C-looking ids", () => {
    expect(isRegisteredSkillId("A-MUL-02")).toBe(true);
    expect(isRegisteredSkillId("A-MUL-99")).toBe(false);
    expect(isRegisteredSkillId("D-OTHER-01")).toBe(false);
  });
});
