import { describe, expect, it } from "vitest";
import {
  GENERATOR_VERSION,
  FRACTION_COMPARISON_QUOTAS,
  FRACTION_PERCENT_CATEGORY_QUOTAS,
  FRACTION_PERCENT_LIBRARY,
  FOUR_THREE_DIGIT_ADDITION_QUOTAS,
  GenerationContext,
  THREE_DIGIT_ADD_SUBTRACT_QUOTAS,
  THREE_BY_TWO_DIVISION_QUOTAS,
  MULTI_DIGIT_DIVISION_QUOTAS,
  TWO_BY_ONE_MULTIPLY_QUOTAS,
  TWO_BY_TWO_MULTIPLY_QUOTAS,
  TWO_DIGIT_ADD_SUBTRACT_QUOTAS,
  SPECIAL_TWO_BY_TWO_QUOTAS,
  allocateMultiDigitDivisionQuota,
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
  it("normalizes legacy full-width fraction comparison symbols", () => {
    const question = generateQuestion(
      "fraction_comparison",
      "comparison",
      deterministicContext(73),
    );
    const fullWidthAnswer = { "<": "＜", "=": "＝", ">": "＞" }[
      question.answer
    ];

    expect(fullWidthAnswer).toBeDefined();
    expect(grade(question, fullWidthAnswer ?? "").isCorrect).toBe(true);
    expect(grade(question, question.answer).isCorrect).toBe(true);
  });
  it("keeps division effective-digit answers numeric", () => {
    for (let i = 0; i < 100; i++) {
      const q = generateQuestion("multi_digit_division");
      expect(q.answer).toMatch(/^\d+$/);
    }
  });

  it("creates percent-to-fraction fill-ins from the fixed relation library", () => {
    for (let index = 0; index < 100; index += 1) {
      const question = generateQuestion(
        "fraction_percent_conversion",
        "percent_to_fraction",
      );
      const relation = FRACTION_PERCENT_LIBRARY.find(
        ({ numerator, denominator }) =>
          numerator === question.data.numerator &&
          denominator === question.data.denominator,
      );
      expect(relation).toBeDefined();
      expect(question.prompt).toBe(`${relation?.percentAnswer}% ≈ __ / __`);
      expect(question.data.options).toBeUndefined();
    }
  });

  it("requires the preset simplest fraction instead of an equivalent fraction", () => {
    const question = generateQuestion(
      "fraction_percent_conversion",
      "percent_to_fraction",
      deterministicContext(52),
    );
    const numerator = question.data.numerator as number;
    const denominator = question.data.denominator as number;

    expect(grade(question, `${numerator}/${denominator}`).accuracyLevel).toBe(
      "exact",
    );
    expect(
      grade(question, `${numerator * 2}/${denominator * 2}`).accuracyLevel,
    ).toBe("wrong");
    expect(grade(question, `${numerator}/0`).isCorrect).toBe(false);
    expect(grade(question, `${numerator + 1}/${denominator}`).isCorrect).toBe(
      false,
    );
  });

  it("contains the complete fixed public-exam fraction-percent library", () => {
    const relations = FRACTION_PERCENT_LIBRARY.map(
      ({ numerator, denominator, percentAnswer }) =>
        `${numerator}/${denominator}:${percentAnswer}`,
    );
    expect(relations).toEqual([
      "1/3:33.3",
      "1/4:25",
      "1/5:20",
      "1/6:16.7",
      "1/7:14.3",
      "1/8:12.5",
      "1/9:11.1",
      "1/10:10",
      "1/11:9.1",
      "1/12:8.3",
      "1/13:7.7",
      "1/14:7.1",
      "1/15:6.7",
      "1/16:6.25",
      "1/17:5.9",
      "1/18:5.6",
      "1/19:5.3",
      "1/20:5",
      "1/25:4",
      "1/40:2.5",
      "1/50:2",
      "2/3:66.7",
      "3/4:75",
      "2/5:40",
      "3/5:60",
      "4/5:80",
      "5/6:83.3",
      "2/7:28.6",
      "3/7:42.9",
      "4/7:57.1",
      "5/7:71.4",
      "6/7:85.7",
      "3/8:37.5",
      "5/8:62.5",
      "7/8:87.5",
      "2/9:22.2",
      "4/9:44.4",
      "5/9:55.6",
      "7/9:77.8",
      "8/9:88.9",
      "5/12:41.7",
      "7/12:58.3",
      "11/12:91.7",
      "3/16:18.75",
      "5/16:31.25",
      "7/16:43.75",
    ]);
    expect(new Set(relations)).toHaveProperty("size", relations.length);
  });

  it("uses exact unit and non-unit coverage for both directions", () => {
    const subtypes = ["fraction_to_percent", "percent_to_fraction"] as const;
    subtypes.forEach((subtype) => {
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
        const questions = generateSet(
          "fraction_percent_conversion",
          subtype,
          count,
          deterministicContext(count + subtype.length),
        );
        allocateStructureQuota(count, FRACTION_PERCENT_CATEGORY_QUOTAS).forEach(
          ({ primaryStructure, count: expected }) => {
            expect(
              questions.filter(
                (question) => question.primaryStructure === primaryStructure,
              ),
            ).toHaveLength(expected);
          },
        );
        questions.forEach((question) => {
          if (subtype === "percent_to_fraction") {
            expect(question.data.options).toBeUndefined();
            expect(question.prompt).toContain("≈ __ / __");
          } else {
            expect(question.acceptedRange).toBeUndefined();
            expect(question.prompt).toContain("≈ ___%");
          }
        });
      });
    });
  });

  it("does not repeat a fixed relation before its category pool is exhausted", () => {
    const questions = generateSet(
      "fraction_percent_conversion",
      "fraction_to_percent",
      40,
      deterministicContext(93),
    );
    for (const structure of ["unit_fraction", "common_non_unit_fraction"]) {
      const fractions = questions
        .filter((question) => question.primaryStructure === structure)
        .map(
          (question) =>
            `${question.data.numerator}/${question.data.denominator}`,
        );
      expect(new Set(fractions).size).toBe(fractions.length);
    }
  });

  it("grades only the preset fraction-to-percent answer", () => {
    const question = generateSet(
      "fraction_percent_conversion",
      "fraction_to_percent",
      10,
      deterministicContext(14),
    )[0];
    expect(grade(question, question.answer)).toEqual({
      isCorrect: true,
      accuracyLevel: "exact",
    });
    expect(grade(question, String(Number(question.answer) + 0.1))).toEqual({
      isCorrect: false,
      accuracyLevel: "wrong",
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
    expect(classifyFractionComparison(37, 83, 37, 91)).toBe("direct_relation");
    expect(classifyFractionComparison(46, 83, 56, 97)).toBe(
      "benchmark_same_side",
    );
    expect(classifyFractionComparison(46, 99, 56, 101)).toBe(
      "benchmark_opposite_sides",
    );
    expect(classifyFractionComparison(42, 56, 416, 545)).toBe(
      "cross_scale_near_ratio",
    );
    expect(classifyFractionComparison(231, 528, 344, 786)).toBe(
      "very_close_ratio",
    );
    expect(classifyFractionComparison(17, 51, 34, 102)).toBeUndefined();
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
        expect((a as number) * (d as number)).not.toBe(
          (c as number) * (b as number),
        );
        const expectedAnswer =
          (a as number) * (d as number) > (c as number) * (b as number)
            ? ">"
            : "<";
        expect(question.answer).toBe(expectedAnswer);
        expect(question.answer).not.toBe("=");
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
        expect((a as number) % (b as number)).not.toBe(0);
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

  it("reuses three-by-two structures for the three-percent estimate mode", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "three_by_two_division",
        "quotient_estimate_3_percent",
        count,
        deterministicContext(count + 900),
      );

      expect(questions).toHaveLength(count);
      allocateStructureQuota(count, THREE_BY_TWO_DIVISION_QUOTAS).forEach(
        ({ primaryStructure, count: expected }) => {
          expect(
            questions.filter(
              (question) => question.primaryStructure === primaryStructure,
            ),
          ).toHaveLength(expected);
        },
      );
      questions.forEach((question) => {
        const quotient = question.data.quotient as number;
        expect(
          (question.data.a as number) % (question.data.b as number),
        ).not.toBe(0);
        expect(question.subtype).toBe("quotient_estimate_3_percent");
        expect(question.acceptedRange).toEqual({
          min: quotient * 0.97,
          max: quotient * 1.03,
        });
      });
    });
  });

  it("grades three-percent estimates against the real quotient with inclusive boundaries", () => {
    const question = generateQuestion(
      "three_by_two_division",
      "quotient_estimate_3_percent",
      deterministicContext(923),
    );
    const quotient = question.data.quotient as number;

    expect(grade(question, String(quotient * 0.97)).isCorrect).toBe(true);
    expect(grade(question, String(quotient * 1.03)).isCorrect).toBe(true);
    expect(grade(question, String(quotient * 0.969)).isCorrect).toBe(false);
    expect(grade(question, String(quotient * 1.031)).isCorrect).toBe(false);
    expect(grade(question, "").isCorrect).toBe(false);
    expect(grade(question, "not-a-number").isCorrect).toBe(false);
    expect(grade(question, "Infinity").isCorrect).toBe(false);
  });

  it("creates feasible multi-digit joint quotas from actual questions", () => {
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((count) => {
      const questions = generateSet(
        "multi_digit_division",
        "quotient_two",
        count,
        deterministicContext(800 + count),
      );
      const planned = allocateMultiDigitDivisionQuota(count);
      const expectedStructures = allocateStructureQuota(
        count,
        MULTI_DIGIT_DIVISION_QUOTAS,
      );

      expect(questions).toHaveLength(count);
      expectedStructures.forEach(({ primaryStructure, count: expectedCount }) =>
        expect(
          questions.filter(
            (question) => question.primaryStructure === primaryStructure,
          ),
        ).toHaveLength(expectedCount),
      );
      expect(
        questions
          .map((question) => ({
            primaryStructure: question.primaryStructure,
            divisorDigits: String(question.data.b).length,
          }))
          .sort((left, right) =>
            `${left.primaryStructure}-${left.divisorDigits}`.localeCompare(
              `${right.primaryStructure}-${right.divisorDigits}`,
            ),
          ),
      ).toEqual(
        planned
          .map(({ primaryStructure, divisorDigits }) => ({
            primaryStructure,
            divisorDigits,
          }))
          .sort((left, right) =>
            `${left.primaryStructure}-${left.divisorDigits}`.localeCompare(
              `${right.primaryStructure}-${right.divisorDigits}`,
            ),
          ),
      );
      questions.forEach((question) => {
        expect(
          classifyMultiDigitDivision(
            question.data.a as number,
            question.data.b as number,
          ),
        ).toBe(question.primaryStructure);
        expect(question.secondaryTags).toEqual([
          `divisor_${String(question.data.b).length}_digit`,
        ]);
      });
    });
  });

  it("keeps multi-digit joint labels intact when deterministic fallback is used", () => {
    const context: GenerationContext = {
      random: () => 0,
      createId: (() => {
        let id = 0;
        return () => `fallback-${id++}`;
      })(),
    };
    const questions = generateSet(
      "multi_digit_division",
      "quotient_two",
      20,
      context,
    );

    expect(
      questions
        .map((question) => ({
          primaryStructure: question.primaryStructure,
          divisorDigits: String(question.data.b).length,
        }))
        .sort((left, right) =>
          `${left.primaryStructure}-${left.divisorDigits}`.localeCompare(
            `${right.primaryStructure}-${right.divisorDigits}`,
          ),
        ),
    ).toEqual(
      allocateMultiDigitDivisionQuota(20)
        .map(({ primaryStructure, divisorDigits }) => ({
          primaryStructure,
          divisorDigits,
        }))
        .sort((left, right) =>
          `${left.primaryStructure}-${left.divisorDigits}`.localeCompare(
            `${right.primaryStructure}-${right.divisorDigits}`,
          ),
        ),
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

  it("creates constrained special-training sets with required metadata", () => {
    const multiplication = generateSet(
      "special_two_by_two_multiply",
      "special_two_by_two",
      20,
      deterministicContext(701),
    );
    expect(
      Object.fromEntries(
        new Map(
          SPECIAL_TWO_BY_TWO_QUOTAS.map(({ primaryStructure, ratio }) => [
            primaryStructure,
            Math.round(ratio * 20),
          ]),
        ),
      ),
    ).toEqual({
      single_side_medium_load: 4,
      ordinary_no_shortcut: 9,
      double_high_load: 7,
    });
    expect(multiplication).toHaveLength(20);
    multiplication.forEach((question) => {
      expect(question.data.carryLoad).toBeTypeOf("number");
      expect(question.data.factorAOnes).toBeTypeOf("number");
    });
    const scaling = generateSet(
      "special_hundred_scaling_division",
      "hundred_scaling",
      20,
      deterministicContext(702),
    );
    expect(
      scaling.filter((question) => question.data.correctionDirection === "up"),
    ).toHaveLength(10);
    expect(
      scaling.filter(
        (question) => question.data.correctionDirection === "down",
      ),
    ).toHaveLength(10);
    scaling.forEach((question) => {
      expect([600, 700, 800, 900]).toContain(question.data.baseline);
      expect(question.data.relativeDeviation).toBeTypeOf("number");
    });
  });
});
