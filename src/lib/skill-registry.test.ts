import { describe, expect, it } from "vitest";
import {
  getSkillDefinition,
  isRegisteredSkillId,
  skillDefinitions,
} from "./skill-registry";

describe("canonical A registry", () => {
  it("contains exactly eight formal abilities", () => {
    expect(skillDefinitions).toHaveLength(8);
    expect(skillDefinitions.map((ability) => ability.id)).toEqual([
      "A-ADD-01",
      "A-SUB-01",
      "A-COM-01",
      "A-MUL-01",
      "A-MUL-02",
      "A-MUL-03",
      "A-FRA-01",
      "A-PCT-01",
    ]);
  });

  it("resolves canonical metadata and rejects retired leaf IDs", () => {
    expect(getSkillDefinition("A-MUL-02")).toMatchObject({
      displayName: "逆向乘法口诀",
      masteryProfile: "R",
    });
    expect(isRegisteredSkillId("A-MUL-02")).toBe(true);
    expect(isRegisteredSkillId("A-MUL-04")).toBe(false);
    expect(isRegisteredSkillId("B-R-03")).toBe(false);
    expect(isRegisteredSkillId("C-DIVSCALE-04")).toBe(false);
  });
});
