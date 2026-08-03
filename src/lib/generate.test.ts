import { describe, expect, it } from "vitest";
import {
  GENERATOR_VERSION,
  FRACTION_COMPARISON_QUOTAS,
  FRACTION_PERCENT_QUOTAS,
  FRACTION_CANDIDATES,
  FOUR_THREE_DIGIT_ADDITION_QUOTAS,
  GenerationContext,
  THREE_DIGIT_ADD_SUBTRACT_QUOTAS,
  THREE_BY_TWO_DIVISION_QUOTAS,
  MULTI_DIGIT_DIVISION_QUOTAS,
  TWO_BY_ONE_MULTIPLY_QUOTAS,
  TWO_BY_TWO_MULTIPLY_QUOTAS,
  TWO_DIGIT_ADD_SUBTRACT_QUOTAS,
  allocateStructureQuota,
  classifyThreeDigitAddSubtract,
  classifyThreeByTwoDivision,
  classifyMultiDigitDivision,
  classifyFractionComparison,
  additionCarryProfile,
  classifyFourThreeDigitAddition,
  classifyTwoByOneMultiply,
  classifyTwoByTwoMultiply,
  classifyTwoDigitAddSubtract,
  generateQuestion,
  generateSet,
  grade,
} from "./generate";
import { questionTypes } from "./types";

function deterministicContext(seed: number): GenerationContext {
  let state = seed >>> 0;
  let id = 0;
  return {
    random: () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 2 ** 32;
    },
    createId: () => `test-question-${id++}`,
  };
}

describe("question generators", () => {
  it("generates valid questions for each V1 type", () => {
    for (const type of questionTypes) {
      for (let i = 0; i < 100; i++) {
        const q = generateQuestion(type);
        expect(q.answer).not.toBe("");
        expect(q.prompt).not.toBe("");
      }
    }
  });
  it("grades exact answers", () => {
    const q = generateQuestion("two_by_two_multiply");
    expect(grade(q, q.answer).isCorrect).toBe(true);
    expect(grade(q, "not-an-answer").isCorrect).toBe(false);
  });
  it("keeps division effective-digit answers numeric", () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion("multi_digit_division");
      expect(q.answer).toMatch(/^\d+$/);
    }
  });

  it("creates four clickable options for percent-to-fraction questions", () => {
    for (let index = 0; index < 100; index += 1) {
      const question = generateQuestion(
        "fraction_percent_conversion",
        "percent_to_fraction",
      );
      const options = question.data.options;
      expect(Array.isArray(options)).toBe(true);
      expect(options).toHaveLength(4);
      expect(options).toContain(question.answer);
      expect(new Set(options as string[]).size).toBe(4);
    }
  });

  it("includes extended reciprocal fractions in the candidate pool", () => {
    expect(FRACTION_CANDIDATES).toEqual(
      expect.arrayContaining([
        "1/9",
        "1/10",
        "1/11",
        "1/12",
        "1/13",
        "1/14",
        "1/15",
      ]),
    );
  });

  it("uses exact fraction-percent structure quotas for both subtypes", () => {
    const subtypes = ["fraction_to_percent", "percent_to_fraction"] as const;
    subtypes.forEach((subtype) => {
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
        const questions = generateSet(
          "fraction_percent_conversion",
          subtype,
          count,
          deterministicContext(count + subtype.length),
        );
        allocateStructureQuota(count, FRACTION_PERCENT_QUOTAS).forEach(
          ({ primaryStructure, count: expected }) => {
            expect(
              questions.filter(
                (question) => question.primaryStructure === primaryStructure,
              ),
            ).toHaveLength(expected);
          },
        );
        questions.forEach((question) => {
          if (subtype === "percent_to_fraction")
            expect(question.data.options).toContain(question.answer);
          else expect(question.acceptedRange).toBeDefined();
        });
      });
    });
  });

  it("reproduces question content, order and deterministic IDs from the same generation context", () => {
    const first = generateSet(
      "fraction_percent_conversion",
      "percent_to_fraction",
      10,
      deterministicContext(42),
    );
    const second = generateSet(
      "fraction_percent_conversion",
      "percent_to_fraction",
      10,
      deterministicContext(42),
    );

    expect(first).toEqual(second);
    expect(
      first.every(
        (question) => question.primaryStructure !== "baseline_random",
      ),
    ).toBe(true);
    expect(first.every((question) => question.secondaryTags.length === 0)).toBe(
      true,
    );
    expect(
      first.every(
        (question) => question.generationRuleVersion === GENERATOR_VERSION,
      ),
    ).toBe(true);
  });

  it("finishes four-addend generation when an injected random source repeats", () => {
    const fallbackEvents: { attempts: number }[] = [];
    const constrainedContext: GenerationContext = {
      random: () => 0,
      createId: () => "fallback-question",
      onFallback: (event) => fallbackEvents.push(event),
    };

    const question = generateQuestion(
      "multi_number_add_subtract",
      "standard",
      constrainedContext,
    );

    expect(question.data.values as string[]).toHaveLength(4);
    expect(question.primaryStructure).toBe("single_column_carry");
    expect(question.answer).toBe(
      String(
        (question.data.values as string[])
          .map(Number)
          .reduce((sum, value) => sum + value, 0),
      ),
    );
    expect(fallbackEvents).toEqual([]);
  });

  it("finishes structured multiplication when an injected random source repeats", () => {
    const question = generateQuestion("two_by_one_multiply", "standard", {
      random: () => 0.1,
      createId: () => "round-source-question",
    });

    expect(question.prompt).toBe("15×2＝");
    expect(question.answer).toBe("30");
    expect(question.primaryStructure).toBe("single_carry");
  });

  it("allocates exact 10, 20 and 50-question structure quotas by largest remainder", () => {
    const quotas = [
      { primaryStructure: "no_carry", ratio: 0.1 },
      { primaryStructure: "single_carry", ratio: 0.4 },
      { primaryStructure: "multi_carry", ratio: 0.5 },
    ];

    expect(allocateStructureQuota(10, quotas)).toEqual([
      { primaryStructure: "no_carry", count: 1 },
      { primaryStructure: "single_carry", count: 4 },
      { primaryStructure: "multi_carry", count: 5 },
    ]);
    expect(
      allocateStructureQuota(20, quotas).map((allocation) => allocation.count),
    ).toEqual([2, 8, 10]);
    expect(
      allocateStructureQuota(50, quotas).map((allocation) => allocation.count),
    ).toEqual([5, 20, 25]);
  });

  it("uses declaration order to resolve equal quota remainders and rejects invalid quota input", () => {
    expect(
      allocateStructureQuota(10, [
        { primaryStructure: "first", ratio: 0.25 },
        { primaryStructure: "second", ratio: 0.25 },
        { primaryStructure: "third", ratio: 0.5 },
      ]),
    ).toEqual([
      { primaryStructure: "first", count: 3 },
      { primaryStructure: "second", count: 2 },
      { primaryStructure: "third", count: 5 },
    ]);
    expect(() =>
      allocateStructureQuota(10, [{ primaryStructure: "only", ratio: 0.8 }]),
    ).toThrow("比例之和为 1");
  });

  it("allocates every supported question count exactly and reproducibly", () => {
    const quotas = [
      { primaryStructure: "first", ratio: 0.3 },
      { primaryStructure: "second", ratio: 0.2 },
      { primaryStructure: "third", ratio: 0.2 },
      { primaryStructure: "fourth", ratio: 0.3 },
    ];

    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const first = allocateStructureQuota(count, quotas);
      expect(first.reduce((sum, allocation) => sum + allocation.count, 0)).toBe(
        count,
      );
      expect(first.every((allocation) => allocation.count >= 0)).toBe(true);
      expect(allocateStructureQuota(count, quotas)).toEqual(first);
    });
  });

  it("classifies two-digit addition and subtraction with boundary priority", () => {
    expect(classifyTwoDigitAddSubtract(42, 35, true)).toBe(
      "no_carry_or_borrow",
    );
    expect(classifyTwoDigitAddSubtract(67, 28, true)).toBe(
      "single_carry_or_borrow",
    );
    expect(classifyTwoDigitAddSubtract(68, 37, true)).toBe(
      "boundary_challenge",
    );
    expect(classifyTwoDigitAddSubtract(74, 21, false)).toBe(
      "no_carry_or_borrow",
    );
    expect(classifyTwoDigitAddSubtract(63, 28, false)).toBe(
      "single_carry_or_borrow",
    );
    expect(classifyTwoDigitAddSubtract(38, 31, false)).toBe(
      "boundary_challenge",
    );
  });

  it("creates exact, verifiable two-digit structure quotas for every legal count", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "two_digit_add_subtract",
        "standard",
        count,
        deterministicContext(count),
      );
      const expected = new Map(
        allocateStructureQuota(count, TWO_DIGIT_ADD_SUBTRACT_QUOTAS).map(
          ({ primaryStructure, count: structureCount }) => [
            primaryStructure,
            structureCount,
          ],
        ),
      );
      const actual = new Map<string, number>();

      questions.forEach((question) => {
        const { a, b, add } = question.data;
        expect(typeof a).toBe("number");
        expect(typeof b).toBe("number");
        expect(typeof add).toBe("boolean");
        expect(question.secondaryTags).toEqual([]);
        expect(question.difficulty.tags).toEqual(["整数"]);
        expect(question.data.a).not.toBe(0);
        expect((a as number) % 10).not.toBe(0);
        expect((b as number) % 10).not.toBe(0);
        expect(
          classifyTwoDigitAddSubtract(a as number, b as number, add as boolean),
        ).toBe(question.primaryStructure);
        expect(question.answer).toBe(
          String(
            add ? (a as number) + (b as number) : (a as number) - (b as number),
          ),
        );
        actual.set(
          question.primaryStructure,
          (actual.get(question.primaryStructure) ?? 0) + 1,
        );
      });

      expect(Object.fromEntries(actual)).toEqual(Object.fromEntries(expected));
    });
  });

  it("reproduces a structured two-digit set with a fixed generation context", () => {
    const first = generateSet(
      "two_digit_add_subtract",
      "standard",
      30,
      deterministicContext(91),
    );
    const second = generateSet(
      "two_digit_add_subtract",
      "standard",
      30,
      deterministicContext(91),
    );

    expect(first).toEqual(second);
  });

  it("classifies three-digit addition and subtraction by exact carry or borrow count", () => {
    expect(classifyThreeDigitAddSubtract(542, 316, true)).toBe(
      "no_carry_or_borrow",
    );
    expect(classifyThreeDigitAddSubtract(684, 125, false)).toBe(
      "single_carry_or_borrow",
    );
    expect(classifyThreeDigitAddSubtract(687, 128, true)).toBe(
      "double_carry_or_borrow",
    );
    expect(classifyThreeDigitAddSubtract(621, 143, false)).toBe(
      "double_carry_or_borrow",
    );
    expect(classifyThreeDigitAddSubtract(321, 654, false)).toBeUndefined();
  });

  it("creates exact, verifiable three-digit structure quotas for every legal count", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "three_digit_add_subtract",
        "standard",
        count,
        deterministicContext(count + 100),
      );
      const expected = new Map(
        allocateStructureQuota(count, THREE_DIGIT_ADD_SUBTRACT_QUOTAS).map(
          ({ primaryStructure, count: structureCount }) => [
            primaryStructure,
            structureCount,
          ],
        ),
      );
      const actual = new Map<string, number>();

      questions.forEach((question) => {
        const { a, b, add } = question.data;
        expect(typeof a).toBe("number");
        expect(typeof b).toBe("number");
        expect(typeof add).toBe("boolean");
        expect(question.secondaryTags).toEqual([]);
        expect(question.difficulty.tags).toEqual(["三位数"]);
        expect((a as number) % 10).not.toBe(0);
        expect((b as number) % 10).not.toBe(0);
        expect(
          classifyThreeDigitAddSubtract(
            a as number,
            b as number,
            add as boolean,
          ),
        ).toBe(question.primaryStructure);
        expect(question.answer).toBe(
          String(
            add ? (a as number) + (b as number) : (a as number) - (b as number),
          ),
        );
        actual.set(
          question.primaryStructure,
          (actual.get(question.primaryStructure) ?? 0) + 1,
        );
      });

      expect(Object.fromEntries(actual)).toEqual(Object.fromEntries(expected));
    });
  });

  it("reproduces a structured three-digit set with a fixed generation context", () => {
    const first = generateSet(
      "three_digit_add_subtract",
      "standard",
      30,
      deterministicContext(192),
    );
    const second = generateSet(
      "three_digit_add_subtract",
      "standard",
      30,
      deterministicContext(192),
    );

    expect(first).toEqual(second);
  });

  it("classifies two-by-one multiplication by exact carry count", () => {
    expect(classifyTwoByOneMultiply(12, 2)).toBe("no_carry");
    expect(classifyTwoByOneMultiply(15, 2)).toBe("single_carry");
    expect(classifyTwoByOneMultiply(68, 8)).toBe("double_carry");
    expect(classifyTwoByOneMultiply(99, 1)).toBeUndefined();
  });

  it("creates exact two-by-one multiplication quotas for every legal count", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "two_by_one_multiply",
        "standard",
        count,
        deterministicContext(count + 200),
      );
      const expected = new Map(
        allocateStructureQuota(count, TWO_BY_ONE_MULTIPLY_QUOTAS).map(
          ({ primaryStructure, count: structureCount }) => [
            primaryStructure,
            structureCount,
          ],
        ),
      );
      const actual = new Map<string, number>();

      questions.forEach((question) => {
        const { a, b } = question.data;
        expect(typeof a).toBe("number");
        expect(typeof b).toBe("number");
        expect((a as number) % 10).not.toBe(0);
        expect(question.answer).toBe(String((a as number) * (b as number)));
        expect(classifyTwoByOneMultiply(a as number, b as number)).toBe(
          question.primaryStructure,
        );
        expect(question.secondaryTags).toEqual(
          (b as number) >= 8 ? ["high_multiplier"] : [],
        );
        actual.set(
          question.primaryStructure,
          (actual.get(question.primaryStructure) ?? 0) + 1,
        );
      });

      expect(Object.fromEntries(actual)).toEqual(Object.fromEntries(expected));
    });
  });

  it("reproduces a structured two-by-one set with a fixed generation context", () => {
    const first = generateSet(
      "two_by_one_multiply",
      "standard",
      30,
      deterministicContext(293),
    );
    const second = generateSet(
      "two_by_one_multiply",
      "standard",
      30,
      deterministicContext(293),
    );

    expect(first).toEqual(second);
  });

  it("classifies two-by-two multiplication with mutually exclusive strategy priority", () => {
    expect(classifyTwoByTwoMultiply(48, 37)).toBe("near_ten");
    expect(classifyTwoByTwoMultiply(13, 47)).toBe("teen_factor");
    expect(classifyTwoByTwoMultiply(23, 47)).toBe("small_ones");
    expect(classifyTwoByTwoMultiply(46, 57)).toBe("general");
    expect(classifyTwoByTwoMultiply(20, 47)).toBeUndefined();
  });

  it("creates exact two-by-two multiplication quotas for every legal count", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "two_by_two_multiply",
        "standard",
        count,
        deterministicContext(count + 300),
      );
      const expected = new Map(
        allocateStructureQuota(count, TWO_BY_TWO_MULTIPLY_QUOTAS).map(
          ({ primaryStructure, count: structureCount }) => [
            primaryStructure,
            structureCount,
          ],
        ),
      );
      const actual = new Map<string, number>();

      questions.forEach((question) => {
        const { a, b } = question.data;
        expect(typeof a).toBe("number");
        expect(typeof b).toBe("number");
        expect((a as number) % 10).not.toBe(0);
        expect((b as number) % 10).not.toBe(0);
        expect(question.answer).toBe(String((a as number) * (b as number)));
        expect(classifyTwoByTwoMultiply(a as number, b as number)).toBe(
          question.primaryStructure,
        );
        actual.set(
          question.primaryStructure,
          (actual.get(question.primaryStructure) ?? 0) + 1,
        );
      });

      expect(Object.fromEntries(actual)).toEqual(Object.fromEntries(expected));
    });
  });

  it("reproduces a structured two-by-two set with a fixed generation context", () => {
    const first = generateSet(
      "two_by_two_multiply",
      "standard",
      30,
      deterministicContext(394),
    );
    const second = generateSet(
      "two_by_two_multiply",
      "standard",
      30,
      deterministicContext(394),
    );

    expect(first).toEqual(second);
  });

  it("classifies fraction comparisons into mutually exclusive strategies", () => {
    expect(classifyFractionComparison(37, 83, 37, 91)).toBe(
      "direct_comparison",
    );
    expect(classifyFractionComparison(41, 83, 47, 97)).toBe("same_direction");
    expect(classifyFractionComparison(49, 99, 51, 101)).toBe("near_half");
    expect(classifyFractionComparison(31, 79, 43, 107)).toBe(
      "general_comparison",
    );
    expect(classifyFractionComparison(17, 51, 34, 102)).toBe("equal_fractions");
    expect(classifyFractionComparison(10, 10, 1, 2)).toBeUndefined();
  });

  it("creates exact fraction-comparison quotas and correct cross-product answers", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "fraction_comparison",
        "comparison",
        count,
        deterministicContext(count + 400),
      );
      const expected = new Map(
        allocateStructureQuota(count, FRACTION_COMPARISON_QUOTAS).map(
          ({ primaryStructure, count: structureCount }) => [
            primaryStructure,
            structureCount,
          ],
        ),
      );
      const actual = new Map<string, number>();

      questions.forEach((question) => {
        const { a, b, c, d } = question.data;
        expect(typeof a).toBe("number");
        expect(typeof b).toBe("number");
        expect(typeof c).toBe("number");
        expect(typeof d).toBe("number");
        expect((a as number) / (b as number)).toBeLessThan(1);
        expect((c as number) / (d as number)).toBeLessThan(1);
        expect(
          classifyFractionComparison(
            a as number,
            b as number,
            c as number,
            d as number,
          ),
        ).toBe(question.primaryStructure);
        const expectedAnswer =
          (a as number) * (d as number) === (c as number) * (b as number)
            ? "="
            : (a as number) * (d as number) > (c as number) * (b as number)
              ? ">"
              : "<";
        expect(question.answer).toBe(expectedAnswer);
        actual.set(
          question.primaryStructure,
          (actual.get(question.primaryStructure) ?? 0) + 1,
        );
      });

      expect(Object.fromEntries(actual)).toEqual(Object.fromEntries(expected));
    });
  });

  it("reproduces a structured fraction-comparison set with a fixed generation context", () => {
    const first = generateSet(
      "fraction_comparison",
      "comparison",
      30,
      deterministicContext(495),
    );
    const second = generateSet(
      "fraction_comparison",
      "comparison",
      30,
      deterministicContext(495),
    );

    expect(first).toEqual(second);
  });

  it("classifies four-three-digit addition by real column carries", () => {
    expect(classifyFourThreeDigitAddition([101, 201, 301, 401])).toBe(
      "single_column_carry",
    );
    expect(classifyFourThreeDigitAddition([131, 231, 331, 431])).toBe(
      "double_column_carry",
    );
    expect(classifyFourThreeDigitAddition([123, 223, 323, 331])).toBe(
      "triple_column_carry",
    );
    expect(classifyFourThreeDigitAddition([777, 778, 889, 899])).toBe(
      "high_carry_load",
    );
    expect(classifyFourThreeDigitAddition([123, 234, 345])).toBeUndefined();
    expect(
      classifyFourThreeDigitAddition([123, 234, 345, 4567]),
    ).toBeUndefined();
  });

  it("keeps three-by-two division inside its real quotient range and exact quotas", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "three_by_two_division",
        "quotient_two",
        count,
        deterministicContext(count + 700),
      );
      expect(questions).toHaveLength(count);
      questions.forEach((question) => {
        const { a, b, quotient } = question.data;
        expect(quotient as number).toBeGreaterThan(1);
        expect(quotient as number).toBeLessThan(100);
        expect(classifyThreeByTwoDivision(a as number, b as number)).toBe(
          question.primaryStructure,
        );
      });
      expect(
        questions.filter(
          (question) => question.primaryStructure === "quotient_one_to_ten",
        ).length,
      ).toBe(
        allocateStructureQuota(count, THREE_BY_TWO_DIVISION_QUOTAS)[0].count,
      );
    });
  });

  it("creates multi-digit quotient structures with exact quotas", () => {
    const questions = generateSet(
      "multi_digit_division",
      "quotient_two",
      100,
      deterministicContext(800),
    );
    const expected = allocateStructureQuota(100, MULTI_DIGIT_DIVISION_QUOTAS);
    expected.forEach(({ primaryStructure, count }) =>
      expect(
        questions.filter(
          (question) => question.primaryStructure === primaryStructure,
        ),
      ).toHaveLength(count),
    );
    questions.forEach((question) =>
      expect(
        classifyMultiDigitDivision(
          question.data.a as number,
          question.data.b as number,
        ),
      ).toBe(question.primaryStructure),
    );
  });

  it("creates exact four-three-digit addition quotas with correct carry metadata", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "multi_number_add_subtract",
        "standard",
        count,
        deterministicContext(count + 500),
      );
      const expected = new Map(
        allocateStructureQuota(count, FOUR_THREE_DIGIT_ADDITION_QUOTAS).map(
          ({ primaryStructure, count: structureCount }) => [
            primaryStructure,
            structureCount,
          ],
        ),
      );
      const actual = new Map<string, number>();
      const difficultyByStructure: Record<string, number> = {
        single_column_carry: 2,
        double_column_carry: 3,
        triple_column_carry: 4,
        high_carry_load: 5,
      };
      questions.forEach((question) => {
        const values = (question.data.values as string[]).map(Number);
        const operators = question.data.operators as string[];
        expect(values).toHaveLength(4);
        expect(values.every((value) => value >= 100 && value <= 999)).toBe(
          true,
        );
        expect(operators).toEqual(["+", "+", "+"]);
        expect(classifyFourThreeDigitAddition(values)).toBe(
          question.primaryStructure,
        );
        const answer = values.reduce((sum, value) => sum + value, 0);
        expect(question.answer).toBe(String(answer));
        const carries = additionCarryProfile(values);
        expect(carries).toEqual({
          onesCarry: question.data.onesCarry,
          tensCarry: question.data.tensCarry,
          hundredsCarry: question.data.hundredsCarry,
        });
        expect(question.generationRuleVersion).toBe(GENERATOR_VERSION);
        expect(question.difficulty.level).toBe(
          difficultyByStructure[question.primaryStructure],
        );
        const carryValues = carries ? Object.values(carries) : [];
        expect(carryValues.some((carry) => carry > 0)).toBe(true);
        if (question.primaryStructure === "high_carry_load") {
          expect(carryValues.every((carry) => carry > 0)).toBe(true);
          expect(Math.max(...carryValues)).toBeGreaterThanOrEqual(2);
        } else {
          expect(Math.max(...carryValues)).toBe(1);
        }
        actual.set(
          question.primaryStructure,
          (actual.get(question.primaryStructure) ?? 0) + 1,
        );
      });
      expect(Object.fromEntries(actual)).toEqual(Object.fromEntries(expected));
    });
  });

  it("reproduces a structured four-addend set with a fixed generation context", () => {
    expect(
      generateSet(
        "multi_number_add_subtract",
        "standard",
        30,
        deterministicContext(596),
      ),
    ).toEqual(
      generateSet(
        "multi_number_add_subtract",
        "standard",
        30,
        deterministicContext(596),
      ),
    );
  });
});
