import { GeneratedQuestion, QuestionType, Subtype } from "./types";

export const GENERATOR_VERSION = "2.5.0";
export const MAX_GENERATION_ATTEMPTS = 24;
const MAX_NON_ROUND_ATTEMPTS = 12;

/**
 * Keeps generation deterministic in tests without coupling production IDs to
 * random-number generation. Future structured generators share this contract.
 */
export interface GenerationContext {
  random: () => number;
  createId: () => string;
  onFallback?: (event: GenerationFallbackEvent) => void;
}

export interface GenerationFallbackEvent {
  type: QuestionType;
  subtype: Subtype;
  attempts: number;
}

export interface StructureQuota {
  primaryStructure: string;
  ratio: number;
}

export interface StructureAllocation {
  primaryStructure: string;
  count: number;
}

export type TwoDigitAddSubtractStructure =
  "no_carry_or_borrow" | "single_carry_or_borrow" | "boundary_challenge";

export const TWO_DIGIT_ADD_SUBTRACT_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "no_carry_or_borrow", ratio: 0.1 },
  { primaryStructure: "single_carry_or_borrow", ratio: 0.6 },
  { primaryStructure: "boundary_challenge", ratio: 0.3 },
];

export type ThreeDigitAddSubtractStructure =
  "no_carry_or_borrow" | "single_carry_or_borrow" | "double_carry_or_borrow";

export const THREE_DIGIT_ADD_SUBTRACT_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "no_carry_or_borrow", ratio: 0.1 },
  { primaryStructure: "single_carry_or_borrow", ratio: 0.6 },
  { primaryStructure: "double_carry_or_borrow", ratio: 0.3 },
];

export type TwoByOneMultiplyStructure =
  "no_carry" | "single_carry" | "double_carry";

export const TWO_BY_ONE_MULTIPLY_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "no_carry", ratio: 0.1 },
  { primaryStructure: "single_carry", ratio: 0.4 },
  { primaryStructure: "double_carry", ratio: 0.5 },
];

export type TwoByTwoMultiplyStructure =
  "near_ten" | "teen_factor" | "small_ones" | "general";

export const TWO_BY_TWO_MULTIPLY_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "near_ten", ratio: 0.3 },
  { primaryStructure: "teen_factor", ratio: 0.2 },
  { primaryStructure: "small_ones", ratio: 0.2 },
  { primaryStructure: "general", ratio: 0.3 },
];

export type FractionComparisonStructure =
  "direct_comparison" | "same_direction" | "near_half" | "general_comparison";

/**
 * Primary structures are mutually exclusive. Secondary tags remain available
 * for later analysis, but never participate in set-level quota arithmetic.
 */
export const FRACTION_COMPARISON_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "direct_comparison", ratio: 0.1 },
  { primaryStructure: "same_direction", ratio: 0.4 },
  { primaryStructure: "near_half", ratio: 0.2 },
  { primaryStructure: "general_comparison", ratio: 0.3 },
];

export type FourThreeDigitAdditionStructure =
  | "single_column_carry"
  | "double_column_carry"
  | "triple_column_carry"
  | "high_carry_load";

/**
 * Four-addend training should be dominated by realistic multi-column carries.
 * The lightest structure remains only as a short warm-up and no-carry questions
 * are intentionally excluded from normal sets.
 */
export const FOUR_THREE_DIGIT_ADDITION_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "single_column_carry", ratio: 0.1 },
  { primaryStructure: "double_column_carry", ratio: 0.25 },
  { primaryStructure: "triple_column_carry", ratio: 0.4 },
  { primaryStructure: "high_carry_load", ratio: 0.25 },
];

export type ThreeByTwoDivisionStructure =
  | "quotient_one_to_ten"
  | "quotient_ten_to_one_hundred"
  | "leading_digit_mislead"
  | "near_estimate_boundary";

export const THREE_BY_TWO_DIVISION_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "quotient_one_to_ten", ratio: 0.25 },
  { primaryStructure: "quotient_ten_to_one_hundred", ratio: 0.35 },
  { primaryStructure: "leading_digit_mislead", ratio: 0.2 },
  { primaryStructure: "near_estimate_boundary", ratio: 0.2 },
];

export type MultiDigitDivisionStructure =
  | "quotient_less_than_one"
  | "quotient_one_to_ten"
  | "quotient_ten_to_one_hundred"
  | "quotient_one_hundred_or_more"
  | "near_estimate_boundary";
export const MULTI_DIGIT_DIVISION_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "quotient_less_than_one", ratio: 0.15 },
  { primaryStructure: "quotient_one_to_ten", ratio: 0.25 },
  { primaryStructure: "quotient_ten_to_one_hundred", ratio: 0.3 },
  { primaryStructure: "quotient_one_hundred_or_more", ratio: 0.15 },
  { primaryStructure: "near_estimate_boundary", ratio: 0.15 },
];
export type FractionPercentStructure =
  "unit_fraction" | "common_non_unit_fraction";

export interface FractionPercentRelation {
  numerator: number;
  denominator: number;
  percentAnswer: string;
  primaryStructure: FractionPercentStructure;
}

export const FRACTION_PERCENT_CATEGORY_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "unit_fraction", ratio: 0.5 },
  { primaryStructure: "common_non_unit_fraction", ratio: 0.5 },
];

const unitFraction = (
  denominator: number,
  percentAnswer: string,
): FractionPercentRelation => ({
  numerator: 1,
  denominator,
  percentAnswer,
  primaryStructure: "unit_fraction",
});

const commonFraction = (
  numerator: number,
  denominator: number,
  percentAnswer: string,
): FractionPercentRelation => ({
  numerator,
  denominator,
  percentAnswer,
  primaryStructure: "common_non_unit_fraction",
});

/** Fixed public-exam percentage-to-fraction relations used by both directions. */
export const FRACTION_PERCENT_LIBRARY: readonly FractionPercentRelation[] = [
  unitFraction(3, "33.3"),
  unitFraction(4, "25"),
  unitFraction(5, "20"),
  unitFraction(6, "16.7"),
  unitFraction(7, "14.3"),
  unitFraction(8, "12.5"),
  unitFraction(9, "11.1"),
  unitFraction(10, "10"),
  unitFraction(11, "9.1"),
  unitFraction(12, "8.3"),
  unitFraction(13, "7.7"),
  unitFraction(14, "7.1"),
  unitFraction(15, "6.7"),
  unitFraction(16, "6.25"),
  unitFraction(17, "5.9"),
  unitFraction(18, "5.6"),
  unitFraction(19, "5.3"),
  unitFraction(20, "5"),
  unitFraction(25, "4"),
  unitFraction(40, "2.5"),
  unitFraction(50, "2"),
  commonFraction(2, 3, "66.7"),
  commonFraction(3, 4, "75"),
  commonFraction(2, 5, "40"),
  commonFraction(3, 5, "60"),
  commonFraction(4, 5, "80"),
  commonFraction(5, 6, "83.3"),
  commonFraction(2, 7, "28.6"),
  commonFraction(3, 7, "42.9"),
  commonFraction(4, 7, "57.1"),
  commonFraction(5, 7, "71.4"),
  commonFraction(6, 7, "85.7"),
  commonFraction(3, 8, "37.5"),
  commonFraction(5, 8, "62.5"),
  commonFraction(7, 8, "87.5"),
  commonFraction(2, 9, "22.2"),
  commonFraction(4, 9, "44.4"),
  commonFraction(5, 9, "55.6"),
  commonFraction(7, 9, "77.8"),
  commonFraction(8, 9, "88.9"),
  commonFraction(5, 12, "41.7"),
  commonFraction(7, 12, "58.3"),
  commonFraction(11, 12, "91.7"),
  commonFraction(3, 16, "18.75"),
  commonFraction(5, 16, "31.25"),
  commonFraction(7, 16, "43.75"),
];
const MULTI_DIGIT_DIVISOR_DIGIT_QUOTAS: readonly StructureQuota[] = [
  { primaryStructure: "3", ratio: 0.75 },
  { primaryStructure: "4", ratio: 0.15 },
  { primaryStructure: "5", ratio: 0.1 },
];

/**
 * Converts structure ratios into an exact set size. Remaining slots go to the
 * largest fractional remainders, with declaration order resolving ties.
 */
export function allocateStructureQuota(
  questionCount: number,
  quotas: readonly StructureQuota[],
): StructureAllocation[] {
  if (!Number.isInteger(questionCount) || questionCount < 0)
    throw new RangeError("题量必须是非负整数。");
  if (!quotas.length) {
    if (questionCount === 0) return [];
    throw new RangeError("非空题组必须提供结构配额。");
  }
  const structures = new Set(quotas.map((quota) => quota.primaryStructure));
  const ratioTotal = quotas.reduce((total, quota) => total + quota.ratio, 0);
  if (
    structures.size !== quotas.length ||
    quotas.some(
      (quota) =>
        !quota.primaryStructure ||
        !Number.isFinite(quota.ratio) ||
        quota.ratio < 0,
    ) ||
    Math.abs(ratioTotal - 1) > Number.EPSILON * quotas.length
  )
    throw new RangeError("结构配额必须使用唯一名称且比例之和为 1。");

  const allocations = quotas.map((quota, index) => {
    const expected = questionCount * quota.ratio;
    return {
      primaryStructure: quota.primaryStructure,
      count: Math.floor(expected),
      remainder: expected - Math.floor(expected),
      index,
    };
  });
  const remaining =
    questionCount -
    allocations.reduce((total, allocation) => total + allocation.count, 0);

  [...allocations]
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.index - right.index,
    )
    .slice(0, remaining)
    .forEach((allocation) => {
      allocation.count += 1;
    });

  return allocations.map(({ primaryStructure, count }) => ({
    primaryStructure,
    count,
  }));
}

export const productionGenerationContext: GenerationContext = {
  random: Math.random,
  createId: () => globalThis.crypto.randomUUID(),
};

const baselineStructure = {
  primaryStructure: "baseline_random",
  secondaryTags: [],
};

const structuredTwoDigitQuestion = (
  primaryStructure: TwoDigitAddSubtractStructure,
) => ({
  primaryStructure,
  secondaryTags: [],
});

const structuredThreeDigitQuestion = (
  primaryStructure: ThreeDigitAddSubtractStructure,
) => ({
  primaryStructure,
  secondaryTags: [],
});

const structuredTwoByOneQuestion = (
  primaryStructure: TwoByOneMultiplyStructure,
  multiplier: number,
) => ({
  primaryStructure,
  secondaryTags: multiplier >= 8 ? ["high_multiplier"] : [],
});

const structuredTwoByTwoQuestion = (
  primaryStructure: TwoByTwoMultiplyStructure,
  a: number,
  b: number,
) => ({
  primaryStructure,
  secondaryTags: twoByTwoSecondaryTags(primaryStructure, a, b),
});

const structuredFractionComparisonQuestion = (
  primaryStructure: FractionComparisonStructure,
) => ({
  primaryStructure,
  secondaryTags: [],
});

const structuredFourAdditionQuestion = (
  primaryStructure: FourThreeDigitAdditionStructure,
) => ({ primaryStructure, secondaryTags: [] });

const randomInteger = (context: GenerationContext, min: number, max: number) =>
  Math.floor(context.random() * (max - min + 1)) + min;

const shuffle = <T>(context: GenerationContext, values: T[]) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInteger(context, 0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const meta = (level: 1 | 2 | 3 | 4 | 5, tags: string[]) => ({
  level,
  tags,
});

const q = (
  context: GenerationContext,
  type: QuestionType,
  subtype: Subtype,
  prompt: string,
  answer: string,
  data: GeneratedQuestion["data"],
  level: 1 | 2 | 3 | 4 | 5,
  tags: string[],
  acceptedRange?: GeneratedQuestion["acceptedRange"],
  structure: Pick<
    GeneratedQuestion,
    "primaryStructure" | "secondaryTags"
  > = baselineStructure,
): GeneratedQuestion => ({
  id: context.createId(),
  type,
  subtype,
  prompt,
  answer,
  data,
  difficulty: meta(level, tags),
  ...structure,
  acceptedRange,
  generationRuleVersion: GENERATOR_VERSION,
});

const nonRound = (context: GenerationContext, min: number, max: number) => {
  for (let attempt = 0; attempt < MAX_NON_ROUND_ATTEMPTS; attempt += 1) {
    const value = randomInteger(context, min, max);
    if (value % 10 !== 0) return value;
  }
  for (let value = min; value <= max; value += 1) {
    if (value % 10 !== 0) return value;
  }
  throw new RangeError("范围内不存在非整十数字。");
};

/** Returns leading significant digits without rounding; 0.205 becomes "20". */
function sig(value: number, count: number) {
  const absoluteValue = Math.abs(value);
  if (absoluteValue === 0) return "0";
  const scale = 10 ** (Math.floor(Math.log10(absoluteValue)) - count + 1);
  return String(Math.floor(absoluteValue / scale));
}

function threeByTwoAnswerSpec(
  quotient: number,
  subtype: Subtype,
): {
  answer: string;
  acceptedRange?: GeneratedQuestion["acceptedRange"];
} {
  if (subtype === "quotient_first") return { answer: sig(quotient, 1) };
  if (subtype === "quotient_estimate_3_percent")
    return {
      answer: sig(quotient, 2),
      acceptedRange: {
        min: quotient * 0.97,
        max: quotient * 1.03,
      },
    };
  return { answer: sig(quotient, 2) };
}

/**
 * Boundary questions have priority over ordinary carry or borrow questions so
 * each generated set can use mutually exclusive primary-structure quotas.
 */
export function classifyTwoDigitAddSubtract(
  a: number,
  b: number,
  add: boolean,
): TwoDigitAddSubtractStructure | undefined {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return undefined;
  if (a < 10 || a > 99 || b < 10 || b > 99) return undefined;
  if (!add && b > a) return undefined;

  const result = add ? a + b : a - b;
  if ((add && result >= 100) || (!add && result >= 0 && result <= 9))
    return "boundary_challenge";

  const requiresCarryOrBorrow = add
    ? (a % 10) + (b % 10) >= 10
    : a % 10 < b % 10;
  return requiresCarryOrBorrow
    ? "single_carry_or_borrow"
    : "no_carry_or_borrow";
}

/**
 * Counts carries or borrows at the ones and tens columns. The hundreds column
 * never overflows in structured questions, so "double" always means two
 * adjacent operations rather than an unrelated thousands carry.
 */
export function classifyThreeDigitAddSubtract(
  a: number,
  b: number,
  add: boolean,
): ThreeDigitAddSubtractStructure | undefined {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return undefined;
  if (a < 100 || a > 999 || b < 100 || b > 999) return undefined;
  if (!add && b > a) return undefined;

  const onesCarryOrBorrow = add ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10;
  const tensCarryOrBorrow = add
    ? (Math.floor(a / 10) % 10) +
        (Math.floor(b / 10) % 10) +
        (onesCarryOrBorrow ? 1 : 0) >=
      10
    : (Math.floor(a / 10) % 10) - (onesCarryOrBorrow ? 1 : 0) <
      Math.floor(b / 10) % 10;
  const operationCount = Number(onesCarryOrBorrow) + Number(tensCarryOrBorrow);

  if (operationCount === 0) return "no_carry_or_borrow";
  return operationCount === 1
    ? "single_carry_or_borrow"
    : "double_carry_or_borrow";
}

/** Counts the carry from ones and the carry from tens in a two-digit product. */
export function classifyTwoByOneMultiply(
  a: number,
  multiplier: number,
): TwoByOneMultiplyStructure | undefined {
  if (!Number.isInteger(a) || !Number.isInteger(multiplier)) return undefined;
  if (a < 10 || a > 99 || multiplier < 2 || multiplier > 9) return undefined;

  const onesProduct = (a % 10) * multiplier;
  const onesCarry = onesProduct >= 10;
  const tensProduct =
    Math.floor(a / 10) * multiplier + Math.floor(onesProduct / 10);
  const tensCarry = tensProduct >= 10;
  const carryCount = Number(onesCarry) + Number(tensCarry);

  if (carryCount === 0) return "no_carry";
  return carryCount === 1 ? "single_carry" : "double_carry";
}

const isNearTen = (value: number) => {
  const units = value % 10;
  return units <= 2 || units >= 8;
};

const isTeenFactor = (value: number) => value >= 11 && value <= 19;

/**
 * Primary structure uses an ordered strategy: near-ten, then teen factor,
 * then small ones. This keeps quota buckets mutually exclusive even when a
 * factor has more than one useful mental-math feature.
 */
export function classifyTwoByTwoMultiply(
  a: number,
  b: number,
): TwoByTwoMultiplyStructure | undefined {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return undefined;
  if (a < 11 || a > 99 || b < 11 || b > 99) return undefined;
  if (a % 10 === 0 || b % 10 === 0) return undefined;

  if (isNearTen(a) || isNearTen(b)) return "near_ten";
  if (isTeenFactor(a) || isTeenFactor(b)) return "teen_factor";
  if (a % 10 <= 3 || b % 10 <= 3) return "small_ones";
  return "general";
}

function twoByTwoSecondaryTags(
  primaryStructure: TwoByTwoMultiplyStructure,
  a: number,
  b: number,
): string[] {
  const tags: string[] = [];
  if (primaryStructure !== "near_ten" && (isNearTen(a) || isNearTen(b)))
    tags.push("near_ten");
  if (
    primaryStructure !== "teen_factor" &&
    (isTeenFactor(a) || isTeenFactor(b))
  )
    tags.push("teen_factor");
  if (primaryStructure !== "small_ones" && (a % 10 <= 3 || b % 10 <= 3))
    tags.push("small_ones");
  return tags;
}

const isValidFraction = (numerator: number, denominator: number) =>
  Number.isInteger(numerator) &&
  Number.isInteger(denominator) &&
  numerator > 0 &&
  denominator > numerator;

const isNearHalf = (numerator: number, denominator: number) =>
  Math.abs(numerator * 2 - denominator) <= 2;

/**
 * The ordered checks keep overlapping visual patterns out of quota buckets.
 * Equal fractions are excluded from new sets because the training interaction
 * only asks users to choose greater-than or less-than. Immediately decidable
 * pairs take priority over the more demanding strategy buckets.
 */
export function classifyFractionComparison(
  a: number,
  b: number,
  c: number,
  d: number,
): FractionComparisonStructure | undefined {
  if (!isValidFraction(a, b) || !isValidFraction(c, d)) return undefined;

  if (a * d === c * b) return undefined;
  if (isNearHalf(a, b) && isNearHalf(c, d)) return "near_half";

  const direct = a === c || b === d || (a > c && b < d) || (a < c && b > d);
  if (direct) return "direct_comparison";

  const numeratorDirection = Math.sign(a - c);
  const denominatorDirection = Math.sign(b - d);
  if (
    numeratorDirection !== 0 &&
    numeratorDirection === denominatorDirection &&
    Math.abs(Math.abs(a - c) - Math.abs(b - d)) <= 10
  )
    return "same_direction";

  return "general_comparison";
}

function fractionComparisonAnswer(a: number, b: number, c: number, d: number) {
  const left = a * d;
  const right = c * b;
  return left === right ? "=" : left > right ? ">" : "<";
}

function fallbackFractionComparison(
  context: GenerationContext,
  primaryStructure: FractionComparisonStructure,
): GeneratedQuestion {
  const fallback: Record<
    FractionComparisonStructure,
    { a: number; b: number; c: number; d: number }
  > = {
    direct_comparison: { a: 37, b: 83, c: 37, d: 91 },
    same_direction: { a: 41, b: 83, c: 47, d: 97 },
    near_half: { a: 49, b: 99, c: 51, d: 101 },
    general_comparison: { a: 31, b: 79, c: 43, d: 107 },
  };
  const { a, b, c, d } = fallback[primaryStructure];
  return q(
    context,
    "fraction_comparison",
    "comparison",
    `${a}/${b} ？ ${c}/${d}`,
    fractionComparisonAnswer(a, b, c, d),
    { a, b, c, d },
    4,
    ["分数比较", "fallback"],
    undefined,
    structuredFractionComparisonQuestion(primaryStructure),
  );
}

function fractionComparisonOperandsForStructure(
  context: GenerationContext,
  primaryStructure: FractionComparisonStructure,
): { a: number; b: number; c: number; d: number } {
  if (primaryStructure === "direct_comparison") {
    const a = randomInteger(context, 12, 98);
    return {
      a,
      b: randomInteger(context, a + 20, 180),
      c: a,
      d: randomInteger(context, a + 21, 200),
    };
  }
  if (primaryStructure === "near_half") {
    const b = randomInteger(context, 71, 149);
    const d = randomInteger(context, 151, 229);
    const a = Math.floor(b / 2) + (context.random() < 0.5 ? -1 : 1);
    const c = Math.floor(d / 2) + (context.random() < 0.5 ? -1 : 1);
    return { a, b, c, d };
  }
  if (primaryStructure === "same_direction") {
    const a = randomInteger(context, 21, 70);
    const b = randomInteger(context, a + 30, a + 100);
    const numeratorIncrease = randomInteger(context, 2, 15);
    const denominatorIncrease =
      numeratorIncrease + randomInteger(context, -5, 5);
    return { a, b, c: a + numeratorIncrease, d: b + denominatorIncrease };
  }
  const a = randomInteger(context, 21, 60);
  const b = randomInteger(context, 120, 170);
  return {
    a,
    b,
    c: a + randomInteger(context, 35, 65),
    d: b + randomInteger(context, 120, 170),
  };
}

function generateFractionComparisonByStructure(
  context: GenerationContext,
  primaryStructure: FractionComparisonStructure,
): GeneratedQuestion {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const { a, b, c, d } = fractionComparisonOperandsForStructure(
      context,
      primaryStructure,
    );
    if (classifyFractionComparison(a, b, c, d) !== primaryStructure) continue;
    return q(
      context,
      "fraction_comparison",
      "comparison",
      `${a}/${b} ？ ${c}/${d}`,
      fractionComparisonAnswer(a, b, c, d),
      { a, b, c, d },
      4,
      ["分数比较"],
      undefined,
      structuredFractionComparisonQuestion(primaryStructure),
    );
  }

  context.onFallback?.({
    type: "fraction_comparison",
    subtype: "comparison",
    attempts: MAX_GENERATION_ATTEMPTS,
  });
  return fallbackFractionComparison(context, primaryStructure);
}

function randomFractionComparisonStructure(
  context: GenerationContext,
): FractionComparisonStructure {
  const choice = context.random();
  if (choice < 0.1) return "direct_comparison";
  if (choice < 0.5) return "same_direction";
  if (choice < 0.7) return "near_half";
  return "general_comparison";
}

export interface AdditionCarryProfile {
  onesCarry: number;
  tensCarry: number;
  hundredsCarry: number;
}

export function additionCarryProfile(
  values: readonly number[],
): AdditionCarryProfile | undefined {
  if (
    values.length !== 4 ||
    !values.every(
      (value) => Number.isInteger(value) && value >= 100 && value <= 999,
    )
  )
    return undefined;
  const onesCarry = Math.floor(
    values.reduce((sum, value) => sum + (value % 10), 0) / 10,
  );
  const tensCarry = Math.floor(
    (values.reduce((sum, value) => sum + (Math.floor(value / 10) % 10), 0) +
      onesCarry) /
      10,
  );
  const hundredsCarry = Math.floor(
    (values.reduce((sum, value) => sum + Math.floor(value / 100), 0) +
      tensCarry) /
      10,
  );
  return { onesCarry, tensCarry, hundredsCarry };
}

export function classifyFourThreeDigitAddition(
  values: readonly number[],
): FourThreeDigitAdditionStructure | undefined {
  const profile = additionCarryProfile(values);
  if (!profile) return undefined;
  const carries = [profile.onesCarry, profile.tensCarry, profile.hundredsCarry];
  const activeColumns = carries.filter((carry) => carry > 0).length;
  if (activeColumns === 0) return undefined;
  if (Math.max(...carries) >= 2) return "high_carry_load";
  if (activeColumns === 1) return "single_column_carry";
  if (activeColumns === 2) return "double_column_carry";
  return "triple_column_carry";
}

function digitsWithSum(
  context: GenerationContext,
  target: number,
  minimum: number,
  maximum: number,
): number[] {
  const digits = Array.from({ length: 4 }, () => minimum);
  let remaining = target - minimum * digits.length;
  const capacity = maximum - minimum;
  for (let index = 0; index < digits.length; index += 1) {
    const slotsAfter = digits.length - index - 1;
    const lower = Math.max(0, remaining - slotsAfter * capacity);
    const upper = Math.min(capacity, remaining);
    const increment = randomInteger(context, lower, upper);
    digits[index] += increment;
    remaining -= increment;
  }
  return shuffle(context, digits);
}

function columnDigitsForCarry(
  context: GenerationContext,
  incomingCarry: number,
  outgoingCarry: number,
  minimumDigit: number,
): number[] {
  const minimumSum = Math.max(
    minimumDigit * 4,
    outgoingCarry * 10 - incomingCarry,
  );
  const maximumSum = Math.min(36, outgoingCarry * 10 + 9 - incomingCarry);
  return digitsWithSum(
    context,
    randomInteger(context, minimumSum, maximumSum),
    minimumDigit,
    9,
  );
}

function targetCarryProfile(
  context: GenerationContext,
  primaryStructure: FourThreeDigitAdditionStructure,
): readonly [number, number, number] {
  if (primaryStructure === "single_column_carry") {
    const result: [number, number, number] = [0, 0, 0];
    result[randomInteger(context, 0, 2)] = 1;
    return result;
  }
  if (primaryStructure === "double_column_carry") {
    const profiles: readonly (readonly [number, number, number])[] = [
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
    ];
    return profiles[randomInteger(context, 0, profiles.length - 1)];
  }
  if (primaryStructure === "triple_column_carry") return [1, 1, 1];
  const profiles: readonly (readonly [number, number, number])[] = [
    [2, 1, 1],
    [1, 2, 1],
    [1, 1, 2],
    [2, 2, 2],
    [3, 2, 2],
  ];
  return profiles[randomInteger(context, 0, profiles.length - 1)];
}

function buildFourThreeDigitAdditionQuestion(
  context: GenerationContext,
  primaryStructure: FourThreeDigitAdditionStructure,
): GeneratedQuestion {
  const [onesCarry, tensCarry, hundredsCarry] = targetCarryProfile(
    context,
    primaryStructure,
  );
  const ones = columnDigitsForCarry(context, 0, onesCarry, 1);
  const tens = columnDigitsForCarry(context, onesCarry, tensCarry, 0);
  const hundreds = columnDigitsForCarry(context, tensCarry, hundredsCarry, 1);
  const values = hundreds.map(
    (digit, index) => digit * 100 + tens[index] * 10 + ones[index],
  );
  const answer = values.reduce((sum, value) => sum + value, 0);
  const prompt = `${values.join("+")}=`;
  const levelByStructure: Record<
    FourThreeDigitAdditionStructure,
    2 | 3 | 4 | 5
  > = {
    single_column_carry: 2,
    double_column_carry: 3,
    triple_column_carry: 4,
    high_carry_load: 5,
  };
  return q(
    context,
    "multi_number_add_subtract",
    "standard",
    prompt,
    String(answer),
    {
      values: values.map(String),
      operators: ["+", "+", "+"],
      onesCarry,
      tensCarry,
      hundredsCarry,
    },
    levelByStructure[primaryStructure],
    ["四项", "三位数", "连续相加"],
    undefined,
    structuredFourAdditionQuestion(primaryStructure),
  );
}

function randomFourAdditionStructure(
  context: GenerationContext,
): FourThreeDigitAdditionStructure {
  const index = randomInteger(
    context,
    0,
    FOUR_THREE_DIGIT_ADDITION_QUOTAS.length - 1,
  );
  return FOUR_THREE_DIGIT_ADDITION_QUOTAS[index]
    .primaryStructure as FourThreeDigitAdditionStructure;
}

export function classifyThreeByTwoDivision(
  a: number,
  b: number,
): ThreeByTwoDivisionStructure | undefined {
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 100 ||
    a > 999 ||
    b < 10 ||
    b > 99
  )
    return undefined;
  const value = a / b;
  if (Math.floor(a / 100) < Math.floor(b / 10) && value >= 5 && value < 10)
    return "leading_digit_mislead";
  if (Math.min(value % 1, 1 - (value % 1)) <= 0.08)
    return "near_estimate_boundary";
  return value < 10 ? "quotient_one_to_ten" : "quotient_ten_to_one_hundred";
}

export function classifyMultiDigitDivision(
  a: number,
  b: number,
): MultiDigitDivisionStructure | undefined {
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    a < 10000 ||
    a > 99999 ||
    b < 100 ||
    b > 99999
  )
    return undefined;
  const value = a / b;
  if (Math.min(value % 1, 1 - (value % 1)) <= 0.03)
    return "near_estimate_boundary";
  if (value < 1) return "quotient_less_than_one";
  if (value < 10) return "quotient_one_to_ten";
  if (value < 100) return "quotient_ten_to_one_hundred";
  return "quotient_one_hundred_or_more";
}

function buildMultiDigitDivisionQuestion(
  context: GenerationContext,
  structure: MultiDigitDivisionStructure,
  divisorDigits: number,
): GeneratedQuestion {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const a = nonRound(context, 10023, 99897);
    const b = nonRound(
      context,
      10 ** (divisorDigits - 1),
      10 ** divisorDigits - 1,
    );
    if (classifyMultiDigitDivision(a, b) !== structure) continue;
    const quotient = a / b;
    return q(
      context,
      "multi_digit_division",
      "quotient_two",
      `${a}÷${b}`,
      sig(quotient, 2),
      { a, b, quotient, rule: "quotient_two", divisorDigits },
      5,
      ["直除", "干扰数字"],
      undefined,
      {
        primaryStructure: structure,
        secondaryTags: [`divisor_${divisorDigits}_digit`],
      },
    );
  }
  const fallback: Record<MultiDigitDivisionStructure, [number, number]> = {
    quotient_less_than_one: [12347, 58291],
    quotient_one_to_ten: [81256, 39548],
    quotient_ten_to_one_hundred: [81256, 395],
    quotient_one_hundred_or_more: [81256, 123],
    near_estimate_boundary: [49901, 499],
  };
  const [a, b] = fallback[structure];
  const quotient = a / b;
  return q(
    context,
    "multi_digit_division",
    "quotient_two",
    `${a}÷${b}`,
    sig(quotient, 2),
    { a, b, quotient, rule: "quotient_two", divisorDigits: String(b).length },
    5,
    ["直除", "fallback"],
    undefined,
    {
      primaryStructure: structure,
      secondaryTags: [`divisor_${String(b).length}_digit`],
    },
  );
}

function buildFractionPercentQuestion(
  context: GenerationContext,
  subtype: Subtype,
  relation: FractionPercentRelation,
): GeneratedQuestion {
  const { numerator, denominator, percentAnswer, primaryStructure } = relation;
  if (subtype === "percent_to_fraction") {
    const answer = `${numerator}/${denominator}`;
    return q(
      context,
      "fraction_percent_conversion",
      subtype,
      `${percentAnswer}% ≈ __ / __`,
      answer,
      { numerator, denominator, percent: Number(percentAnswer), percentAnswer },
      3,
      ["百化分", "反向关系"],
      undefined,
      { primaryStructure, secondaryTags: [] },
    );
  }
  return q(
    context,
    "fraction_percent_conversion",
    "fraction_to_percent",
    `${numerator}/${denominator} ≈ ___%`,
    percentAnswer,
    { numerator, denominator, percentAnswer },
    3,
    ["百化分"],
    undefined,
    { primaryStructure, secondaryTags: [] },
  );
}

function relationsForStructure(
  structure: FractionPercentStructure,
): FractionPercentRelation[] {
  return FRACTION_PERCENT_LIBRARY.filter(
    (relation) => relation.primaryStructure === structure,
  );
}

/**
 * Samples without replacement inside each pass through a category. Repetition
 * begins only when the requested count exceeds that category's fixed pool.
 */
function selectFractionPercentRelations(
  context: GenerationContext,
  structure: FractionPercentStructure,
  count: number,
): FractionPercentRelation[] {
  const candidates = relationsForStructure(structure);
  const selected: FractionPercentRelation[] = [];
  while (selected.length < count) {
    const cycle = shuffle(context, candidates);
    const previous = selected.at(-1);
    if (
      previous &&
      cycle.length > 1 &&
      cycle[0].numerator === previous.numerator &&
      cycle[0].denominator === previous.denominator
    ) {
      [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    }
    selected.push(...cycle.slice(0, count - selected.length));
  }
  return selected;
}

function generateThreeByTwoDivisionByStructure(
  context: GenerationContext,
  subtype: Subtype,
  structure: ThreeByTwoDivisionStructure,
): GeneratedQuestion {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const a = nonRound(context, 103, 997);
    const b = nonRound(context, 11, 99);
    // These exercises train estimation and significant digits. Exact division
    // removes that decision, so keep every newly generated quotient non-integer.
    if (a % b === 0) continue;
    if (classifyThreeByTwoDivision(a, b) !== structure) continue;
    const quotient = a / b;
    const answerSpec = threeByTwoAnswerSpec(quotient, subtype);
    return q(
      context,
      "three_by_two_division",
      subtype,
      `${a}÷${b}`,
      answerSpec.answer,
      { a, b, quotient, rule: subtype },
      4,
      ["直除", "有效位"],
      answerSpec.acceptedRange,
      { primaryStructure: structure, secondaryTags: [] },
    );
  }
  const fallback =
    structure === "leading_digit_mislead"
      ? [398, 79]
      : structure === "near_estimate_boundary"
        ? [473, 47]
        : structure === "quotient_one_to_ten"
          ? [523, 83]
          : [523, 47];
  const [a, b] = fallback;
  const quotient = a / b;
  const answerSpec = threeByTwoAnswerSpec(quotient, subtype);
  return q(
    context,
    "three_by_two_division",
    subtype,
    `${a}÷${b}`,
    answerSpec.answer,
    { a, b, quotient, rule: subtype },
    4,
    ["直除", "有效位", "fallback"],
    answerSpec.acceptedRange,
    { primaryStructure: structure, secondaryTags: [] },
  );
}

function fallbackTwoDigitAddSubtract(
  context: GenerationContext,
  primaryStructure: TwoDigitAddSubtractStructure,
): GeneratedQuestion {
  const fallback =
    primaryStructure === "no_carry_or_borrow"
      ? { a: 74, b: 21, add: false }
      : primaryStructure === "single_carry_or_borrow"
        ? { a: 67, b: 28, add: true }
        : { a: 68, b: 37, add: true };
  const { a, b, add } = fallback;

  return q(
    context,
    "two_digit_add_subtract",
    "standard",
    `${a}${add ? "＋" : "－"}${b}＝`,
    String(add ? a + b : a - b),
    { a, b, add },
    3,
    ["整数", "fallback"],
    undefined,
    structuredTwoDigitQuestion(primaryStructure),
  );
}

function generateTwoDigitAddSubtractByStructure(
  context: GenerationContext,
  primaryStructure: TwoDigitAddSubtractStructure,
): GeneratedQuestion {
  const add = context.random() < 0.55;
  const { a, b } = twoDigitOperandsForStructure(context, primaryStructure, add);

  return q(
    context,
    "two_digit_add_subtract",
    "standard",
    `${a}${add ? "＋" : "－"}${b}＝`,
    String(add ? a + b : a - b),
    { a, b, add },
    3,
    ["整数"],
    undefined,
    structuredTwoDigitQuestion(primaryStructure),
  );
}

/**
 * Builds each mutually exclusive structure directly. This avoids probabilistic
 * retry bias: a 100-question set should not silently replace rare boundary
 * questions with fallback questions simply because random rejection was slow.
 */
function twoDigitOperandsForStructure(
  context: GenerationContext,
  primaryStructure: TwoDigitAddSubtractStructure,
  add: boolean,
): { a: number; b: number } {
  if (primaryStructure === "boundary_challenge") {
    if (add) {
      const aTens = randomInteger(context, 5, 8);
      const aUnits = randomInteger(context, 1, 9);
      const bTens = randomInteger(context, 10 - aTens, 9);
      const bUnits = randomInteger(context, 1, 9);
      return { a: aTens * 10 + aUnits, b: bTens * 10 + bUnits };
    }
    const difference = randomInteger(context, 1, 8);
    const bTens = randomInteger(context, 1, 8);
    const bUnits = randomInteger(context, 1, 9 - difference);
    const b = bTens * 10 + bUnits;
    return { a: b + difference, b };
  }

  if (primaryStructure === "single_carry_or_borrow") {
    if (add) {
      const aTens = randomInteger(context, 1, 7);
      const bTens = randomInteger(context, 1, 8 - aTens);
      const aUnits = randomInteger(context, 1, 9);
      const bUnits = randomInteger(context, 10 - aUnits, 9);
      return { a: aTens * 10 + aUnits, b: bTens * 10 + bUnits };
    }
    const aTens = randomInteger(context, 3, 9);
    const bTens = randomInteger(context, 1, aTens - 2);
    const aUnits = randomInteger(context, 1, 8);
    const bUnits = randomInteger(context, aUnits + 1, 9);
    return { a: aTens * 10 + aUnits, b: bTens * 10 + bUnits };
  }

  if (add) {
    const aTens = randomInteger(context, 1, 7);
    const bTens = randomInteger(context, 1, 8 - aTens);
    const aUnits = randomInteger(context, 1, 8);
    const bUnits = randomInteger(context, 1, 9 - aUnits);
    return { a: aTens * 10 + aUnits, b: bTens * 10 + bUnits };
  }
  const aTens = randomInteger(context, 2, 9);
  const bTens = randomInteger(context, 1, aTens - 1);
  const bUnits = randomInteger(context, 1, 9);
  const aUnits = randomInteger(context, bUnits, 9);
  return { a: aTens * 10 + aUnits, b: bTens * 10 + bUnits };
}

function randomTwoDigitAddSubtractStructure(
  context: GenerationContext,
): TwoDigitAddSubtractStructure {
  const choice = context.random();
  if (choice < 0.1) return "no_carry_or_borrow";
  if (choice < 0.7) return "single_carry_or_borrow";
  return "boundary_challenge";
}

function fallbackThreeDigitAddSubtract(
  context: GenerationContext,
  primaryStructure: ThreeDigitAddSubtractStructure,
): GeneratedQuestion {
  const fallback =
    primaryStructure === "no_carry_or_borrow"
      ? { a: 742, b: 321, add: false }
      : primaryStructure === "single_carry_or_borrow"
        ? { a: 684, b: 125, add: false }
        : { a: 621, b: 143, add: false };
  const { a, b, add } = fallback;

  return q(
    context,
    "three_digit_add_subtract",
    "standard",
    `${a}${add ? "＋" : "－"}${b}＝`,
    String(add ? a + b : a - b),
    { a, b, add },
    4,
    ["三位数", "fallback"],
    undefined,
    structuredThreeDigitQuestion(primaryStructure),
  );
}

function generateThreeDigitAddSubtractByStructure(
  context: GenerationContext,
  primaryStructure: ThreeDigitAddSubtractStructure,
): GeneratedQuestion {
  const add = context.random() < 0.55;
  const { a, b } = threeDigitOperandsForStructure(
    context,
    primaryStructure,
    add,
  );

  return q(
    context,
    "three_digit_add_subtract",
    "standard",
    `${a}${add ? "＋" : "－"}${b}＝`,
    String(add ? a + b : a - b),
    { a, b, add },
    4,
    ["三位数"],
    undefined,
    structuredThreeDigitQuestion(primaryStructure),
  );
}

/**
 * Direct construction gives exact carry/borrow counts without retry bias.
 * All branches keep the hundreds column inside three digits and avoid a
 * trailing zero, preserving the existing low-value-number filter.
 */
function threeDigitOperandsForStructure(
  context: GenerationContext,
  primaryStructure: ThreeDigitAddSubtractStructure,
  add: boolean,
): { a: number; b: number } {
  if (add) {
    const hundreds = () => {
      const aHundreds = randomInteger(context, 1, 7);
      const bHundreds = randomInteger(context, 1, 8 - aHundreds);
      return { aHundreds, bHundreds };
    };

    if (primaryStructure === "no_carry_or_borrow") {
      const { aHundreds, bHundreds } = hundreds();
      const aTens = randomInteger(context, 1, 7);
      const bTens = randomInteger(context, 1, 8 - aTens);
      const aOnes = randomInteger(context, 1, 8);
      const bOnes = randomInteger(context, 1, 9 - aOnes);
      return {
        a: aHundreds * 100 + aTens * 10 + aOnes,
        b: bHundreds * 100 + bTens * 10 + bOnes,
      };
    }

    if (primaryStructure === "single_carry_or_borrow") {
      const carryAtOnes = context.random() < 0.5;
      const { aHundreds, bHundreds } = hundreds();
      if (carryAtOnes) {
        const aTens = randomInteger(context, 1, 7);
        const bTens = randomInteger(context, 1, 8 - aTens);
        const aOnes = randomInteger(context, 1, 9);
        const bOnes = randomInteger(context, 10 - aOnes, 9);
        return {
          a: aHundreds * 100 + aTens * 10 + aOnes,
          b: bHundreds * 100 + bTens * 10 + bOnes,
        };
      }
      const aTens = randomInteger(context, 1, 8);
      const bTens = randomInteger(context, 10 - aTens, 9);
      const aOnes = randomInteger(context, 1, 8);
      const bOnes = randomInteger(context, 1, 9 - aOnes);
      return {
        a: aHundreds * 100 + aTens * 10 + aOnes,
        b: bHundreds * 100 + bTens * 10 + bOnes,
      };
    }

    const { aHundreds, bHundreds } = hundreds();
    const aTens = randomInteger(context, 1, 9);
    const bTens = randomInteger(context, 9 - aTens, 9);
    const aOnes = randomInteger(context, 1, 9);
    const bOnes = randomInteger(context, 10 - aOnes, 9);
    return {
      a: aHundreds * 100 + aTens * 10 + aOnes,
      b: bHundreds * 100 + bTens * 10 + bOnes,
    };
  }

  const aHundreds = randomInteger(context, 2, 9);
  const bHundreds = randomInteger(context, 1, aHundreds - 1);
  if (primaryStructure === "no_carry_or_borrow") {
    const bTens = randomInteger(context, 1, 9);
    const aTens = randomInteger(context, bTens, 9);
    const bOnes = randomInteger(context, 1, 9);
    const aOnes = randomInteger(context, bOnes, 9);
    return {
      a: aHundreds * 100 + aTens * 10 + aOnes,
      b: bHundreds * 100 + bTens * 10 + bOnes,
    };
  }

  if (primaryStructure === "single_carry_or_borrow") {
    const borrowAtOnes = context.random() < 0.5;
    if (borrowAtOnes) {
      const aTens = randomInteger(context, 2, 9);
      const bTens = randomInteger(context, 1, aTens - 1);
      const aOnes = randomInteger(context, 1, 8);
      const bOnes = randomInteger(context, aOnes + 1, 9);
      return {
        a: aHundreds * 100 + aTens * 10 + aOnes,
        b: bHundreds * 100 + bTens * 10 + bOnes,
      };
    }
    const aTens = randomInteger(context, 1, 8);
    const bTens = randomInteger(context, aTens + 1, 9);
    const bOnes = randomInteger(context, 1, 9);
    const aOnes = randomInteger(context, bOnes, 9);
    return {
      a: aHundreds * 100 + aTens * 10 + aOnes,
      b: bHundreds * 100 + bTens * 10 + bOnes,
    };
  }

  const aTens = randomInteger(context, 1, 9);
  const bTens = randomInteger(context, aTens, 9);
  const aOnes = randomInteger(context, 1, 8);
  const bOnes = randomInteger(context, aOnes + 1, 9);
  return {
    a: aHundreds * 100 + aTens * 10 + aOnes,
    b: bHundreds * 100 + bTens * 10 + bOnes,
  };
}

function randomThreeDigitAddSubtractStructure(
  context: GenerationContext,
): ThreeDigitAddSubtractStructure {
  const choice = context.random();
  if (choice < 0.1) return "no_carry_or_borrow";
  if (choice < 0.7) return "single_carry_or_borrow";
  return "double_carry_or_borrow";
}

function fallbackTwoByOneMultiply(
  context: GenerationContext,
  primaryStructure: TwoByOneMultiplyStructure,
): GeneratedQuestion {
  const fallback =
    primaryStructure === "no_carry"
      ? { a: 12, multiplier: 2 }
      : primaryStructure === "single_carry"
        ? { a: 15, multiplier: 2 }
        : { a: 68, multiplier: 8 };
  const { a, multiplier } = fallback;

  return q(
    context,
    "two_by_one_multiply",
    "standard",
    `${a}×${multiplier}＝`,
    String(a * multiplier),
    { a, b: multiplier },
    3,
    ["乘法", "fallback"],
    undefined,
    structuredTwoByOneQuestion(primaryStructure, multiplier),
  );
}

function generateTwoByOneMultiplyByStructure(
  context: GenerationContext,
  primaryStructure: TwoByOneMultiplyStructure,
): GeneratedQuestion {
  const { a, multiplier } = twoByOneOperandsForStructure(
    context,
    primaryStructure,
  );

  return q(
    context,
    "two_by_one_multiply",
    "standard",
    `${a}×${multiplier}＝`,
    String(a * multiplier),
    { a, b: multiplier },
    3,
    ["乘法"],
    undefined,
    structuredTwoByOneQuestion(primaryStructure, multiplier),
  );
}

/** Direct construction ensures each product has exactly the requested carry count. */
function twoByOneOperandsForStructure(
  context: GenerationContext,
  primaryStructure: TwoByOneMultiplyStructure,
): { a: number; multiplier: number } {
  if (primaryStructure === "no_carry") {
    const multiplier = randomInteger(context, 2, 4);
    const maximumDigit = Math.floor(9 / multiplier);
    const tens = randomInteger(context, 1, maximumDigit);
    const ones = randomInteger(context, tens === 1 ? 2 : 1, maximumDigit);
    return { a: tens * 10 + ones, multiplier };
  }

  const carryAtOnes =
    primaryStructure === "double_carry" || context.random() < 0.5;
  if (!carryAtOnes) {
    const multiplier = randomInteger(context, 2, 9);
    const maximumOnes = Math.floor(9 / multiplier);
    const minimumTens = Math.ceil(10 / multiplier);
    const tens = randomInteger(context, minimumTens, 9);
    const ones = randomInteger(context, 1, maximumOnes);
    return { a: tens * 10 + ones, multiplier };
  }

  const multiplier = randomInteger(
    context,
    primaryStructure === "double_carry" ? 3 : 2,
    primaryStructure === "double_carry" ? 9 : 5,
  );
  const minimumOnes = Math.ceil(10 / multiplier);
  const ones = randomInteger(context, minimumOnes, 9);
  const carryFromOnes = Math.floor((ones * multiplier) / 10);

  if (primaryStructure === "single_carry") {
    const maximumTens = Math.floor((9 - carryFromOnes) / multiplier);
    const tens = randomInteger(context, 1, maximumTens);
    return { a: tens * 10 + ones, multiplier };
  }

  const minimumTens = Math.ceil((10 - carryFromOnes) / multiplier);
  const tens = randomInteger(context, minimumTens, 9);
  return { a: tens * 10 + ones, multiplier };
}

function randomTwoByOneMultiplyStructure(
  context: GenerationContext,
): TwoByOneMultiplyStructure {
  const choice = context.random();
  if (choice < 0.1) return "no_carry";
  if (choice < 0.5) return "single_carry";
  return "double_carry";
}

function fallbackTwoByTwoMultiply(
  context: GenerationContext,
  primaryStructure: TwoByTwoMultiplyStructure,
): GeneratedQuestion {
  const fallback =
    primaryStructure === "near_ten"
      ? { a: 48, b: 37 }
      : primaryStructure === "teen_factor"
        ? { a: 13, b: 47 }
        : primaryStructure === "small_ones"
          ? { a: 23, b: 47 }
          : { a: 46, b: 57 };
  const { a, b } = fallback;

  return q(
    context,
    "two_by_two_multiply",
    "standard",
    `${a}×${b}＝`,
    String(a * b),
    { a, b },
    4,
    ["两位乘两位", "fallback"],
    undefined,
    structuredTwoByTwoQuestion(primaryStructure, a, b),
  );
}

function generateTwoByTwoMultiplyByStructure(
  context: GenerationContext,
  primaryStructure: TwoByTwoMultiplyStructure,
): GeneratedQuestion {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const { a, b } = twoByTwoOperandsForStructure(context, primaryStructure);
    if (classifyTwoByTwoMultiply(a, b) !== primaryStructure) continue;
    return q(
      context,
      "two_by_two_multiply",
      "standard",
      `${a}×${b}＝`,
      String(a * b),
      { a, b },
      4,
      ["两位乘两位"],
      undefined,
      structuredTwoByTwoQuestion(primaryStructure, a, b),
    );
  }

  context.onFallback?.({
    type: "two_by_two_multiply",
    subtype: "standard",
    attempts: MAX_GENERATION_ATTEMPTS,
  });
  return fallbackTwoByTwoMultiply(context, primaryStructure);
}

function twoByTwoOperandsForStructure(
  context: GenerationContext,
  primaryStructure: TwoByTwoMultiplyStructure,
): { a: number; b: number } {
  if (primaryStructure === "near_ten") {
    const tens = randomInteger(context, 3, 9);
    const offset = [-2, -1, 1, 2][randomInteger(context, 0, 3)];
    return { a: tens * 10 + offset, b: nonRound(context, 21, 99) };
  }
  if (primaryStructure === "teen_factor") {
    return { a: randomInteger(context, 11, 17), b: nonRound(context, 21, 99) };
  }
  if (primaryStructure === "small_ones") {
    return {
      a: randomInteger(context, 2, 9) * 10 + 3,
      b: nonRound(context, 21, 99),
    };
  }
  return { a: nonRound(context, 21, 99), b: nonRound(context, 21, 99) };
}

function randomTwoByTwoMultiplyStructure(
  context: GenerationContext,
): TwoByTwoMultiplyStructure {
  const choice = context.random();
  if (choice < 0.3) return "near_ten";
  if (choice < 0.5) return "teen_factor";
  if (choice < 0.7) return "small_ones";
  return "general";
}

function fallbackQuestion(
  type: QuestionType,
  subtype: Subtype,
  context: GenerationContext,
): GeneratedQuestion {
  if (type === "two_digit_add_subtract")
    return fallbackTwoDigitAddSubtract(context, "no_carry_or_borrow");
  if (type === "three_digit_add_subtract")
    return fallbackThreeDigitAddSubtract(context, "no_carry_or_borrow");
  if (type === "two_by_one_multiply")
    return fallbackTwoByOneMultiply(context, "double_carry");
  if (type === "two_by_two_multiply")
    return fallbackTwoByTwoMultiply(context, "general");
  if (type === "three_by_two_division") {
    const value = 523 / 47;
    const answerSpec = threeByTwoAnswerSpec(value, subtype);
    return q(
      context,
      type,
      subtype,
      "523÷47",
      answerSpec.answer,
      { a: 523, b: 47, quotient: value, rule: subtype },
      4,
      ["直除", "有效位", "fallback"],
      answerSpec.acceptedRange,
    );
  }
  if (type === "multi_digit_division") {
    const value = 81256 / 395;
    return q(
      context,
      type,
      "quotient_two",
      "81256÷395",
      sig(value, 2),
      { a: 81256, b: 395, quotient: value, rule: "quotient_two" },
      5,
      ["直除", "干扰数字", "fallback"],
    );
  }
  if (type === "multi_number_add_subtract")
    return buildFourThreeDigitAdditionQuestion(context, "triple_column_carry");
  if (type === "fraction_percent_conversion") {
    if (subtype === "percent_to_fraction")
      return buildFractionPercentQuestion(
        context,
        subtype,
        FRACTION_PERCENT_LIBRARY[1],
      );
    return buildFractionPercentQuestion(
      context,
      "fraction_to_percent",
      FRACTION_PERCENT_LIBRARY[1],
    );
  }
  return q(
    context,
    type,
    "comparison",
    "1/3  ？  1/2",
    "＜",
    { a: 1, b: 3, c: 1, d: 2 },
    4,
    ["分数比较", "fallback"],
  );
}

export function generateQuestion(
  type: QuestionType,
  subtype: Subtype = "standard",
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (type === "two_digit_add_subtract") {
    return generateTwoDigitAddSubtractByStructure(
      context,
      randomTwoDigitAddSubtractStructure(context),
    );
  }
  if (type === "three_digit_add_subtract") {
    return generateThreeDigitAddSubtractByStructure(
      context,
      randomThreeDigitAddSubtractStructure(context),
    );
  }
  if (type === "two_by_one_multiply") {
    return generateTwoByOneMultiplyByStructure(
      context,
      randomTwoByOneMultiplyStructure(context),
    );
  }
  if (type === "two_by_two_multiply") {
    return generateTwoByTwoMultiplyByStructure(
      context,
      randomTwoByTwoMultiplyStructure(context),
    );
  }
  if (type === "fraction_comparison") {
    return generateFractionComparisonByStructure(
      context,
      randomFractionComparisonStructure(context),
    );
  }
  if (type === "multi_number_add_subtract")
    return buildFourThreeDigitAdditionQuestion(
      context,
      randomFourAdditionStructure(context),
    );
  if (type === "three_by_two_division") {
    const index = randomInteger(
      context,
      0,
      THREE_BY_TWO_DIVISION_QUOTAS.length - 1,
    );
    return generateThreeByTwoDivisionByStructure(
      context,
      subtype,
      THREE_BY_TWO_DIVISION_QUOTAS[index]
        .primaryStructure as ThreeByTwoDivisionStructure,
    );
  }
  if (type === "multi_digit_division") {
    return buildMultiDigitDivisionQuestion(
      context,
      "quotient_ten_to_one_hundred",
      3,
    );
  }
  if (type === "fraction_percent_conversion") {
    const relation =
      FRACTION_PERCENT_LIBRARY[
        randomInteger(context, 0, FRACTION_PERCENT_LIBRARY.length - 1)
      ];
    return buildFractionPercentQuestion(context, subtype, relation);
  }
  const a = randomInteger(context, 10, 999);
  const b = randomInteger(context, a + 1, 1200);
  const c = randomInteger(context, 10, 999);
  const d = randomInteger(context, c + 1, 1200);
  const left = a * d;
  const right = c * b;
  const answer = left === right ? "＝" : left > right ? "＞" : "＜";
  return q(
    context,
    type,
    "comparison",
    `${a}/${b}  ？  ${c}/${d}`,
    answer,
    { a, b, c, d },
    4,
    ["分数比较"],
  );
}

export function generateSet(
  type: QuestionType,
  subtype: Subtype,
  count: number,
  context: GenerationContext = productionGenerationContext,
) {
  if (type === "two_digit_add_subtract") {
    const questions = allocateStructureQuota(
      count,
      TWO_DIGIT_ADD_SUBTRACT_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      Array.from({ length: structureCount }, () =>
        generateTwoDigitAddSubtractByStructure(
          context,
          primaryStructure as TwoDigitAddSubtractStructure,
        ),
      ),
    );
    return shuffle(context, questions);
  }
  if (type === "three_digit_add_subtract") {
    const questions = allocateStructureQuota(
      count,
      THREE_DIGIT_ADD_SUBTRACT_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      Array.from({ length: structureCount }, () =>
        generateThreeDigitAddSubtractByStructure(
          context,
          primaryStructure as ThreeDigitAddSubtractStructure,
        ),
      ),
    );
    return shuffle(context, questions);
  }
  if (type === "two_by_one_multiply") {
    const questions = allocateStructureQuota(
      count,
      TWO_BY_ONE_MULTIPLY_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      Array.from({ length: structureCount }, () =>
        generateTwoByOneMultiplyByStructure(
          context,
          primaryStructure as TwoByOneMultiplyStructure,
        ),
      ),
    );
    return shuffle(context, questions);
  }
  if (type === "two_by_two_multiply") {
    const questions = allocateStructureQuota(
      count,
      TWO_BY_TWO_MULTIPLY_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      Array.from({ length: structureCount }, () =>
        generateTwoByTwoMultiplyByStructure(
          context,
          primaryStructure as TwoByTwoMultiplyStructure,
        ),
      ),
    );
    return shuffle(context, questions);
  }
  if (type === "multi_number_add_subtract") {
    const questions = allocateStructureQuota(
      count,
      FOUR_THREE_DIGIT_ADDITION_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      Array.from({ length: structureCount }, () =>
        buildFourThreeDigitAdditionQuestion(
          context,
          primaryStructure as FourThreeDigitAdditionStructure,
        ),
      ),
    );
    return shuffle(context, questions);
  }
  if (type === "three_by_two_division") {
    return shuffle(
      context,
      allocateStructureQuota(count, THREE_BY_TWO_DIVISION_QUOTAS).flatMap(
        ({ primaryStructure, count: structureCount }) =>
          Array.from({ length: structureCount }, () =>
            generateThreeByTwoDivisionByStructure(
              context,
              subtype,
              primaryStructure as ThreeByTwoDivisionStructure,
            ),
          ),
      ),
    );
  }
  if (type === "multi_digit_division") {
    const structures = allocateStructureQuota(
      count,
      MULTI_DIGIT_DIVISION_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      Array.from(
        { length: structureCount },
        () => primaryStructure as MultiDigitDivisionStructure,
      ),
    );
    const digits = allocateStructureQuota(
      count,
      MULTI_DIGIT_DIVISOR_DIGIT_QUOTAS,
    ).flatMap(({ primaryStructure, count: digitCount }) =>
      Array.from({ length: digitCount }, () => Number(primaryStructure)),
    );
    return shuffle(
      context,
      structures.map((structure, index) =>
        buildMultiDigitDivisionQuestion(context, structure, digits[index]),
      ),
    );
  }
  if (type === "fraction_percent_conversion") {
    const questions = allocateStructureQuota(
      count,
      FRACTION_PERCENT_CATEGORY_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      selectFractionPercentRelations(
        context,
        primaryStructure as FractionPercentStructure,
        structureCount,
      ).map((relation) =>
        buildFractionPercentQuestion(context, subtype, relation),
      ),
    );
    return shuffle(context, questions);
  }
  if (type === "fraction_comparison") {
    const questions = allocateStructureQuota(
      count,
      FRACTION_COMPARISON_QUOTAS,
    ).flatMap(({ primaryStructure, count: structureCount }) =>
      Array.from({ length: structureCount }, () =>
        generateFractionComparisonByStructure(
          context,
          primaryStructure as FractionComparisonStructure,
        ),
      ),
    );
    return shuffle(context, questions);
  }
  return Array.from({ length: count }, () =>
    generateQuestion(type, subtype, context),
  );
}

export function grade(question: GeneratedQuestion, input: string) {
  if (question.type === "fraction_comparison") {
    const normalizedInput = normalizeFractionComparisonAnswer(input);
    const normalizedAnswer = normalizeFractionComparisonAnswer(question.answer);
    return {
      isCorrect: normalizedInput === normalizedAnswer,
      accuracyLevel:
        normalizedInput === normalizedAnswer
          ? ("exact" as const)
          : ("wrong" as const),
    };
  }
  if (
    question.type === "fraction_percent_conversion" &&
    question.subtype === "percent_to_fraction"
  ) {
    const match = input.match(/^(-?\d+)\/(-?\d+)$/);
    const numerator = question.data.numerator;
    const denominator = question.data.denominator;
    if (
      !match ||
      typeof numerator !== "number" ||
      typeof denominator !== "number"
    )
      return { isCorrect: false, accuracyLevel: "wrong" as const };

    const inputNumerator = Number(match[1]);
    const inputDenominator = Number(match[2]);
    if (inputDenominator === 0)
      return { isCorrect: false, accuracyLevel: "wrong" as const };

    const isCorrect =
      inputNumerator === numerator && inputDenominator === denominator;
    return {
      isCorrect,
      accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
    };
  }
  if (
    question.type === "three_by_two_division" &&
    question.subtype === "quotient_estimate_3_percent"
  ) {
    const numberInput = Number(input);
    const quotient = question.data.quotient;
    if (
      !Number.isFinite(numberInput) ||
      typeof quotient !== "number" ||
      quotient === 0
    )
      return { isCorrect: false, accuracyLevel: "wrong" as const };

    const error = Math.abs(numberInput - quotient);
    const tolerance =
      Math.abs(quotient) * 0.03 +
      Number.EPSILON * Math.max(1, Math.abs(quotient));
    const isCorrect = error <= tolerance;
    return {
      isCorrect,
      accuracyLevel:
        input === question.answer
          ? ("exact" as const)
          : isCorrect
            ? ("accepted" as const)
            : ("wrong" as const),
    };
  }
  if (
    question.type === "fraction_percent_conversion" &&
    question.subtype === "fraction_to_percent"
  ) {
    const numberInput = Number(input.replace("%", ""));
    const expected = Number(question.answer);
    if (!Number.isFinite(numberInput) || !Number.isFinite(expected))
      return { isCorrect: false, accuracyLevel: "wrong" as const };
    const isCorrect = numberInput === expected;
    return {
      isCorrect,
      accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
    };
  }
  return {
    isCorrect: input === question.answer,
    accuracyLevel:
      input === question.answer ? ("exact" as const) : ("wrong" as const),
  };
}

/**
 * Earlier comparison controls stored full-width relation symbols while the
 * generator has always frozen ASCII answers. Normalize only those equivalent
 * symbols so legacy active sessions and completed records remain gradeable.
 */
export function normalizeFractionComparisonAnswer(input: string): string {
  if (input === "＜") return "<";
  if (input === "＝") return "=";
  if (input === "＞") return ">";
  return input;
}
