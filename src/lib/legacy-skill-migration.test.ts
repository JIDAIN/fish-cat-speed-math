import { describe, expect, it } from "vitest";
import {
  generateQuestion,
  GenerationContext,
  FRACTION_PERCENT_LIBRARY,
} from "./generate";
import { migrateExistingQuestionToSkillV2 } from "./legacy-skill-migration";
import { isRegisteredSkillId } from "./skill-registry";

function context(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `migration-question-${id++}`,
  };
}

describe("existing generator to skill-v2 migration", () => {
  it.each([
    ["two_digit_add_subtract", "standard"],
    ["three_digit_add_subtract", "standard"],
    ["two_by_one_multiply", "standard"],
    ["two_by_two_multiply", "standard"],
    ["multi_number_add_subtract", "standard"],
    ["three_by_two_division", "quotient_first"],
    ["three_by_two_division", "quotient_two"],
    ["three_by_two_division", "quotient_estimate_3_percent"],
    ["multi_digit_division", "quotient_two"],
    ["fraction_percent_conversion", "fraction_to_percent"],
    ["fraction_percent_conversion", "percent_to_fraction"],
    ["fraction_comparison", "comparison"],
  ] as const)("maps %s / %s to a registered skill", (type, subtype) => {
    const migrated = migrateExistingQuestionToSkillV2(
      generateQuestion(type, subtype, context()),
    );
    expect(migrated.skillId).toBeTruthy();
    expect(isRegisteredSkillId(migrated.skillId)).toBe(true);
    expect(migrated.difficultyBand).toMatch(/^L[123]$/);
    expect(migrated.structureTags).toContain(migrated.primaryStructure);
    expect(migrated.masteryProfile).toMatch(/^[RCDSF]$/);
    expect(migrated.generatorParams).toMatchObject({
      migrationSource: "existing_generator_v2",
      legacyQuestionType: type,
      legacySubtype: subtype,
    });
  });

  it("keeps the current two-by-two task as C-MUL-01 and records a carry leaf", () => {
    const base = generateQuestion("two_by_two_multiply", "standard", context());
    const migrated = migrateExistingQuestionToSkillV2({
      ...base,
      subtype: "carry_intensive",
      data: { ...base.data, carryLoad: 3 },
    });
    expect(migrated.skillId).toBe("C-MUL-01");
    expect(migrated.secondarySkillIds).toEqual(["A-MUL-07"]);
  });

  it("distinguishes fraction-percent directions and unit/non-unit support skills", () => {
    const forward = migrateExistingQuestionToSkillV2(
      generateQuestion("fraction_percent_conversion", "fraction_to_percent", context()),
    );
    const reverse = migrateExistingQuestionToSkillV2(
      generateQuestion("fraction_percent_conversion", "percent_to_fraction", context()),
    );
    expect(forward.skillId).toBe("A-FRA-04");
    expect(forward.secondarySkillIds?.[0]).toMatch(/^A-FRA-0[12]$/);
    expect(reverse.skillId).toBe("A-FRA-03");
    expect(FRACTION_PERCENT_LIBRARY.length).toBeGreaterThan(0);
  });

  it("keeps three-percent division distinct from leading-digit drills", () => {
    const estimate = migrateExistingQuestionToSkillV2(
      generateQuestion("three_by_two_division", "quotient_estimate_3_percent", context()),
    );
    const first = migrateExistingQuestionToSkillV2(
      generateQuestion("three_by_two_division", "quotient_first", context()),
    );
    const two = migrateExistingQuestionToSkillV2(
      generateQuestion("three_by_two_division", "quotient_two", context()),
    );
    expect(estimate).toMatchObject({
      skillId: "C-DIV-01",
      secondarySkillIds: ["C-DIV-12"],
      targetPrecision: "3%",
    });
    expect(first.skillId).toBe("C-DIV-11");
    expect(two.skillId).toBe("C-DIV-12");
  });

  it("does not falsely relabel the historical hundred-scaling prototype as unified C7", () => {
    const legacy = generateQuestion(
      "special_hundred_scaling_division",
      "hundred_scaling",
      context(),
    );
    const migrated = migrateExistingQuestionToSkillV2(legacy);
    expect(migrated).toBe(legacy);
    expect(migrated.skillId).toBeUndefined();
  });
});
