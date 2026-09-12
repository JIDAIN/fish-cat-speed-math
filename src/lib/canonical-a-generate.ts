import { GenerationContext, productionGenerationContext } from "./generate";
import { getSkillDefinition } from "./skill-registry";
import {
  DifficultyBand,
  GeneratedQuestion,
  SkillId,
  StructuredInputKind,
  TargetPrecision,
} from "./types";

export const CANONICAL_A_GENERATOR_VERSION = "a-canonical-1.0.0";

export const canonicalAAbilityIds = [
  "A-ADD-01",
  "A-SUB-01",
  "A-COM-01",
  "A-MUL-01",
  "A-MUL-02",
  "A-MUL-03",
  "A-FRA-01",
  "A-PCT-01",
] as const satisfies readonly SkillId[];

export type CanonicalAAbilityId = (typeof canonicalAAbilityIds)[number];

const canonicalAAbilitySet = new Set<string>(canonicalAAbilityIds);

export function isCanonicalAAbilityId(
  value: unknown,
): value is CanonicalAAbilityId {
  return typeof value === "string" && canonicalAAbilitySet.has(value);
}

const bandLevel: Record<DifficultyBand, 2 | 3 | 5> = {
  L1: 2,
  L2: 3,
  L3: 5,
};

const randomInteger = (context: GenerationContext, min: number, max: number) =>
  Math.floor(context.random() * (max - min + 1)) + min;

const choose = <T>(context: GenerationContext, values: readonly T[]): T =>
  values[randomInteger(context, 0, values.length - 1)];

function shuffle<T>(context: GenerationContext, values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInteger(context, 0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function cleanNumber(value: number, decimals = 6): string {
  const rounded = Number(value.toFixed(decimals));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function acceptedAround(value: number, tolerance: number) {
  const epsilon = Number.EPSILON * Math.max(1, Math.abs(value));
  return {
    min: value - tolerance - epsilon,
    max: value + tolerance + epsilon,
  };
}

function makeQuestion(input: {
  context: GenerationContext;
  abilityId: CanonicalAAbilityId;
  difficultyBand: DifficultyBand;
  prompt: string;
  answer: string;
  inputKind: StructuredInputKind;
  primaryStructure: string;
  data?: GeneratedQuestion["data"];
  secondaryTags?: string[];
  targetPrecision?: TargetPrecision;
  acceptedRange?: GeneratedQuestion["acceptedRange"];
  generatorParams?: GeneratedQuestion["generatorParams"];
  allowedAnswerSet?: GeneratedQuestion["allowedAnswerSet"];
}): GeneratedQuestion {
  const definition = getSkillDefinition(input.abilityId);
  const structureTags = Array.from(
    new Set([
      input.primaryStructure,
      ...(input.secondaryTags ?? []),
      input.difficultyBand.toLowerCase(),
    ]),
  );
  return {
    id: input.context.createId(),
    type: "skill_drill",
    subtype: "skill_drill",
    prompt: input.prompt,
    answer: input.answer,
    acceptedRange: input.acceptedRange,
    data: input.data ?? {},
    difficulty: {
      level: bandLevel[input.difficultyBand],
      tags: ["A层正式能力", ...structureTags],
    },
    primaryStructure: input.primaryStructure,
    secondaryTags: input.secondaryTags ?? [],
    generationRuleVersion: CANONICAL_A_GENERATOR_VERSION,
    skillId: input.abilityId,
    difficultyBand: input.difficultyBand,
    structureTags,
    targetPrecision: input.targetPrecision ?? "exact",
    generatorParams: {
      generatorFamily: "a_canonical",
      abilityId: input.abilityId,
      ...(input.generatorParams ?? {}),
    },
    allowedAnswerSet: input.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind: input.inputKind,
  };
}

function choicePayload(
  values: readonly string[],
  labels: readonly string[] = values,
): GeneratedQuestion["data"] {
  return { choiceValues: [...values], choiceLabels: [...labels] };
}

function fourNumericChoices(
  context: GenerationContext,
  correct: number,
  candidates: readonly number[],
) {
  const unique = new Set<number>([correct]);
  for (const candidate of candidates) {
    if (Number.isFinite(candidate)) unique.add(candidate);
    if (unique.size >= 4) break;
  }
  let offset = 2;
  while (unique.size < 4) {
    unique.add(correct + offset);
    if (unique.size < 4) unique.add(correct - offset);
    offset += 1;
  }
  return shuffle(context, [...unique].slice(0, 4).map(String));
}

function additionCarryCount(a: number, b: number) {
  let left = a;
  let right = b;
  let carry = 0;
  let count = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  while (left > 0 || right > 0) {
    const sum = (left % 10) + (right % 10) + carry;
    carry = sum >= 10 ? 1 : 0;
    if (carry) {
      count += 1;
      consecutive += 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
    left = Math.floor(left / 10);
    right = Math.floor(right / 10);
  }
  return { count, maxConsecutive };
}

function subtractionBorrowProfile(a: number, b: number) {
  let left = Math.max(a, b);
  let right = Math.min(a, b);
  let borrow = 0;
  let borrowCount = 0;
  let crossedZero = false;
  while (left > 0 || right > 0) {
    const originalDigit = left % 10;
    const leftDigit = originalDigit - borrow;
    const rightDigit = right % 10;
    const nextBorrow = leftDigit < rightDigit ? 1 : 0;
    if (nextBorrow) {
      borrowCount += 1;
      if (originalDigit === 0) crossedZero = true;
    }
    borrow = nextBorrow;
    left = Math.floor(left / 10);
    right = Math.floor(right / 10);
  }
  return { borrowCount, crossedZero };
}

function additionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  let a: number;
  let b: number;
  if (difficultyBand === "L1") {
    a = randomInteger(context, 10, 99);
    b = randomInteger(context, 10, 99);
  } else if (difficultyBand === "L2") {
    a = randomInteger(context, 100, 999);
    b = context.random() < 0.5
      ? randomInteger(context, 10, 99)
      : randomInteger(context, 100, 999);
  } else {
    a = 100;
    b = 100;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const candidateA = randomInteger(context, 100, 999);
      const candidateB = randomInteger(context, 100, 999);
      if (additionCarryCount(candidateA, candidateB).count >= 2) {
        a = candidateA;
        b = candidateB;
        break;
      }
    }
  }
  const carry = additionCarryCount(a, b);
  const digits = `${String(a).length}d_${String(b).length}d`;
  return makeQuestion({
    context,
    abilityId: "A-ADD-01",
    difficultyBand,
    prompt: `${a}＋${b}＝`,
    answer: String(a + b),
    inputKind: "number",
    primaryStructure: `addition_${digits}`,
    secondaryTags: [
      carry.count === 0
        ? "no_carry"
        : carry.count === 1
          ? "single_carry"
          : "multi_carry",
      ...(carry.maxConsecutive >= 2 ? ["continuous_carry"] : []),
      ...(`${a}${b}`.includes("0") ? ["contains_zero"] : []),
    ],
    data: { a, b, carryCount: carry.count },
    generatorParams: { a, b, carryCount: carry.count },
  });
}

function subtractionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const min = difficultyBand === "L1" ? 10 : 100;
  const max = difficultyBand === "L1" ? 99 : 999;
  let a = randomInteger(context, min, max);
  let b = randomInteger(context, min, max);
  const zeroRate = difficultyBand === "L1" ? 0.05 : difficultyBand === "L2" ? 0.1 : 0.15;
  if (context.random() < zeroRate) b = a;
  else if (difficultyBand === "L1" && a < b) [a, b] = [b, a];
  const result = a - b;
  const borrow = subtractionBorrowProfile(a, b);
  return makeQuestion({
    context,
    abilityId: "A-SUB-01",
    difficultyBand,
    prompt: `${a}－${b}＝`,
    answer: String(result),
    inputKind: "number",
    primaryStructure: `subtraction_${String(a).length}d_${String(b).length}d`,
    secondaryTags: [
      result > 0 ? "positive_result" : result < 0 ? "negative_result" : "zero_result",
      `borrow_count_${borrow.borrowCount}`,
      ...(borrow.crossedZero ? ["cross_zero"] : []),
      ...(Math.abs(result) <= 30 ? ["near_difference"] : []),
    ],
    data: { a, b, result, borrowCount: borrow.borrowCount, crossedZero: borrow.crossedZero },
    generatorParams: { a, b, resultSign: result > 0 ? "positive" : result < 0 ? "negative" : "zero" },
  });
}

const specialDifferenceAnchors = [111, 125, 143, 167, 250, 333] as const;

function nearDifferenceQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const range =
    difficultyBand === "L1"
      ? { min: 1, max: 5 }
      : difficultyBand === "L2"
        ? { min: 6, max: 10 }
        : { min: 11, max: 30 };
  const magnitude = randomInteger(context, range.min, range.max);
  const signedDifference = context.random() < 0.5 ? magnitude : -magnitude;
  const useSpecialAnchor = context.random() < 0.3;
  const right = useSpecialAnchor
    ? choose(context, specialDifferenceAnchors)
    : randomInteger(context, 20, 970);
  const left = right + signedDifference;
  const choices = fourNumericChoices(context, signedDifference, [
    -signedDifference,
    signedDifference + 1,
    signedDifference - 1,
    signedDifference + (signedDifference > 0 ? -2 : 2),
  ]);
  return makeQuestion({
    context,
    abilityId: "A-COM-01",
    difficultyBand,
    prompt: `${left}－${right}＝`,
    answer: String(signedDifference),
    inputKind: "choice",
    primaryStructure: `near_difference_${range.min}_to_${range.max}`,
    secondaryTags: [
      signedDifference > 0 ? "positive_result" : "negative_result",
      ...(useSpecialAnchor ? ["special_anchor"] : []),
    ],
    data: {
      left,
      right,
      absoluteDifference: magnitude,
      signedDifference,
      ...choicePayload(choices),
    },
    generatorParams: {
      left,
      right,
      differenceBand: `${range.min}-${range.max}`,
      specialAnchor: useSpecialAnchor ? right : 0,
    },
    allowedAnswerSet: [String(signedDifference)],
  });
}

function multiplicationFactQuestion(
  abilityId: "A-MUL-01" | "A-MUL-02",
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const minimum = difficultyBand === "L1" ? 2 : difficultyBand === "L2" ? 3 : 6;
  const a = randomInteger(context, minimum, 9);
  const b = randomInteger(context, minimum, 9);
  const product = a * b;
  const highFact = a >= 6 || b >= 6;

  if (abilityId === "A-MUL-01") {
    const choices = fourNumericChoices(context, product, [
      a * Math.max(2, b - 1),
      a * Math.min(9, b + 1),
      Math.max(2, a - 1) * b,
      Math.min(9, a + 1) * b,
      product + 1,
    ]);
    return makeQuestion({
      context,
      abilityId,
      difficultyBand,
      prompt: `${a}×${b}＝?`,
      answer: String(product),
      inputKind: "choice",
      primaryStructure: highFact ? "high_fact_6_to_9" : "basic_fact_2_to_5",
      data: { a, b, product, ...choicePayload(choices) },
      generatorParams: { factorA: a, factorB: b, direction: "forward" },
      allowedAnswerSet: [String(product)],
    });
  }

  const missingLeft = context.random() < 0.5;
  const correct = missingLeft ? a : b;
  const factorChoices = shuffle(
    context,
    Array.from(new Set([
      correct,
      Math.max(2, correct - 1),
      Math.min(9, correct + 1),
      correct <= 5 ? Math.min(9, correct + 2) : Math.max(2, correct - 2),
      missingLeft ? b : a,
    ])).slice(0, 4).map(String),
  );
  while (factorChoices.length < 4) {
    const candidate = String(randomInteger(context, 2, 9));
    if (!factorChoices.includes(candidate)) factorChoices.push(candidate);
  }
  return makeQuestion({
    context,
    abilityId,
    difficultyBand,
    prompt: missingLeft ? `□×${b}＝${product}` : `${a}×□＝${product}`,
    answer: String(correct),
    inputKind: "choice",
    primaryStructure: highFact ? "inverse_high_fact" : "inverse_basic_fact",
    data: {
      a,
      b,
      product,
      missingSide: missingLeft ? "left" : "right",
      ...choicePayload(factorChoices),
    },
    generatorParams: {
      factorA: a,
      factorB: b,
      direction: "inverse",
      missingSide: missingLeft ? "left" : "right",
    },
    allowedAnswerSet: [String(correct)],
  });
}

function twoByOneQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const a = randomInteger(
    context,
    difficultyBand === "L1" ? 10 : difficultyBand === "L2" ? 20 : 40,
    99,
  );
  const b = randomInteger(
    context,
    2,
    difficultyBand === "L1" ? 5 : difficultyBand === "L2" ? 8 : 9,
  );
  const onesCarry = (a % 10) * b >= 10;
  const tensTotal = Math.floor(a / 10) * b + Math.floor(((a % 10) * b) / 10);
  const secondCarry = tensTotal >= 10;
  const carryCount = Number(onesCarry) + Number(secondCarry);
  return makeQuestion({
    context,
    abilityId: "A-MUL-03",
    difficultyBand,
    prompt: `${a}×${b}＝`,
    answer: String(a * b),
    inputKind: "number",
    primaryStructure: "two_by_one",
    secondaryTags: [
      carryCount === 0
        ? "no_carry"
        : carryCount === 1
          ? "single_carry"
          : "multi_carry",
      ...(a % 10 === 0 ? ["round_ten"] : []),
    ],
    data: { a, b, carryCount },
    generatorParams: { a, b, carryCount },
  });
}

type FixedRelation = {
  numerator: number;
  denominator: number;
  percent: string;
};

const fixedRelations: readonly FixedRelation[] = [
  { numerator: 1, denominator: 2, percent: "50" },
  { numerator: 1, denominator: 3, percent: "33.3" },
  { numerator: 1, denominator: 4, percent: "25" },
  { numerator: 1, denominator: 5, percent: "20" },
  { numerator: 1, denominator: 6, percent: "16.7" },
  { numerator: 1, denominator: 7, percent: "14.3" },
  { numerator: 1, denominator: 8, percent: "12.5" },
  { numerator: 1, denominator: 9, percent: "11.1" },
  { numerator: 1, denominator: 11, percent: "9.1" },
  { numerator: 1, denominator: 12, percent: "8.3" },
  { numerator: 1, denominator: 13, percent: "7.7" },
  { numerator: 1, denominator: 14, percent: "7.1" },
  { numerator: 1, denominator: 15, percent: "6.7" },
  { numerator: 1, denominator: 16, percent: "6.25" },
  { numerator: 1, denominator: 17, percent: "5.9" },
  { numerator: 1, denominator: 18, percent: "5.6" },
  { numerator: 1, denominator: 19, percent: "5.3" },
  { numerator: 1, denominator: 20, percent: "5" },
  { numerator: 1, denominator: 25, percent: "4" },
  { numerator: 1, denominator: 40, percent: "2.5" },
  { numerator: 1, denominator: 50, percent: "2" },
  { numerator: 2, denominator: 7, percent: "28.6" },
  { numerator: 3, denominator: 7, percent: "42.9" },
  { numerator: 3, denominator: 8, percent: "37.5" },
];

function fixedRelationPool(difficultyBand: DifficultyBand) {
  if (difficultyBand === "L1")
    return fixedRelations.filter((relation) =>
      [2, 3, 4, 5, 8, 20, 25, 40, 50].includes(relation.denominator),
    );
  if (difficultyBand === "L2")
    return fixedRelations.filter(
      (relation) => relation.denominator <= 13 || relation.numerator > 1,
    );
  return fixedRelations;
}

function fractionPercentQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const pool = fixedRelationPool(difficultyBand);
  const relation = choose(context, pool);
  const fraction = `${relation.numerator}/${relation.denominator}`;
  const fractionToPercent = context.random() < 0.5;

  if (fractionToPercent) {
    const nearby = [...fixedRelations]
      .filter((candidate) => candidate !== relation)
      .sort(
        (left, right) =>
          Math.abs(Number(left.percent) - Number(relation.percent)) -
          Math.abs(Number(right.percent) - Number(relation.percent)),
      )
      .slice(0, 6)
      .map((candidate) => candidate.percent);
    const choices = shuffle(
      context,
      [...new Set([relation.percent, ...nearby])].slice(0, 4),
    );
    return makeQuestion({
      context,
      abilityId: "A-FRA-01",
      difficultyBand,
      prompt: `${fraction} ≈ ?`,
      answer: relation.percent,
      inputKind: "choice",
      primaryStructure:
        relation.numerator === 1
          ? "unit_fraction_to_percent"
          : "nonunit_fraction_to_percent",
      data: {
        numerator: relation.numerator,
        denominator: relation.denominator,
        percent: relation.percent,
        ...choicePayload(choices, choices.map((value) => `${value}%`)),
      },
      generatorParams: {
        direction: "fraction_to_percent",
        fraction,
        percent: relation.percent,
      },
      allowedAnswerSet: [relation.percent],
    });
  }

  const nearby = [...fixedRelations]
    .filter((candidate) => candidate !== relation)
    .sort(
      (left, right) =>
        Math.abs(Number(left.percent) - Number(relation.percent)) -
        Math.abs(Number(right.percent) - Number(relation.percent)),
    )
    .slice(0, 8)
    .map((candidate) => `${candidate.numerator}/${candidate.denominator}`);
  const choices = shuffle(
    context,
    [...new Set([fraction, ...nearby])].slice(0, 4),
  );
  return makeQuestion({
    context,
    abilityId: "A-FRA-01",
    difficultyBand,
    prompt: `${relation.percent}% 最接近哪个固定分数？`,
    answer: fraction,
    inputKind: "choice",
    primaryStructure:
      relation.numerator === 1
        ? "percent_to_unit_fraction"
        : "percent_to_nonunit_fraction",
    data: {
      numerator: relation.numerator,
      denominator: relation.denominator,
      percent: relation.percent,
      ...choicePayload(choices),
    },
    generatorParams: {
      direction: "percent_to_fraction",
      fraction,
      percent: relation.percent,
    },
    allowedAnswerSet: [fraction],
  });
}

type PercentAnchor = {
  label: string;
  ratio: number;
  friendlyUnit: number;
};

const percentAnchors: readonly PercentAnchor[] = [
  { label: "0.1%", ratio: 0.001, friendlyUnit: 1000 },
  { label: "1%", ratio: 0.01, friendlyUnit: 100 },
  { label: "2%", ratio: 0.02, friendlyUnit: 50 },
  { label: "2.5%", ratio: 0.025, friendlyUnit: 40 },
  { label: "3%", ratio: 0.03, friendlyUnit: 100 },
  { label: "5%", ratio: 0.05, friendlyUnit: 20 },
  { label: "10%", ratio: 0.1, friendlyUnit: 10 },
  { label: "12.5%", ratio: 0.125, friendlyUnit: 8 },
  { label: "20%", ratio: 0.2, friendlyUnit: 5 },
  { label: "25%", ratio: 0.25, friendlyUnit: 4 },
  { label: "33.3%", ratio: 1 / 3, friendlyUnit: 3 },
  { label: "50%", ratio: 0.5, friendlyUnit: 2 },
];

function percentageValueQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const anchor = choose(context, percentAnchors);
  let value: number;
  if (difficultyBand === "L1") {
    const minimumMultiplier = anchor.friendlyUnit >= 100 ? 1 : 10;
    const maximumMultiplier = anchor.friendlyUnit >= 100 ? 20 : 200;
    value = anchor.friendlyUnit * randomInteger(context, minimumMultiplier, maximumMultiplier);
  } else {
    value = randomInteger(context, difficultyBand === "L2" ? 100 : 101, 9999);
    if (difficultyBand === "L3" && value % 10 === 0) value += 3;
  }
  const result = value * anchor.ratio;
  const isApproximateThird = anchor.label === "33.3%";
  const tolerance = Math.max(0.1, Math.abs(result) * 0.005);
  return makeQuestion({
    context,
    abilityId: "A-PCT-01",
    difficultyBand,
    prompt: `求 ${value} 的 ${anchor.label}：`,
    answer: cleanNumber(result),
    inputKind: "number",
    primaryStructure:
      difficultyBand === "L1"
        ? "friendly_percent_block"
        : difficultyBand === "L2"
          ? "standard_percent_block"
          : "non_round_percent_block",
    secondaryTags: [Number.isInteger(result) ? "integer_result" : "decimal_result"],
    targetPrecision: isApproximateThird ? "range" : "exact",
    acceptedRange: isApproximateThird ? acceptedAround(result, tolerance) : undefined,
    data: { value, rateAnchor: anchor.label, ratio: anchor.ratio, result },
    generatorParams: { value, rateAnchor: anchor.label, ratio: anchor.ratio },
  });
}

export function generateCanonicalAQuestion(
  abilityId: CanonicalAAbilityId,
  difficultyBand: DifficultyBand,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (abilityId === "A-ADD-01") return additionQuestion(difficultyBand, context);
  if (abilityId === "A-SUB-01") return subtractionQuestion(difficultyBand, context);
  if (abilityId === "A-COM-01") return nearDifferenceQuestion(difficultyBand, context);
  if (abilityId === "A-MUL-01" || abilityId === "A-MUL-02")
    return multiplicationFactQuestion(abilityId, difficultyBand, context);
  if (abilityId === "A-MUL-03") return twoByOneQuestion(difficultyBand, context);
  if (abilityId === "A-FRA-01") return fractionPercentQuestion(difficultyBand, context);
  return percentageValueQuestion(difficultyBand, context);
}

export function generateCanonicalASet(
  abilityId: CanonicalAAbilityId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    generateCanonicalAQuestion(abilityId, difficultyBand, context),
  );
}

export function gradeCanonicalAQuestion(
  question: GeneratedQuestion,
  input: string,
) {
  if (!isCanonicalAAbilityId(question.skillId))
    throw new Error("Question does not use a canonical A ability.");

  if (question.inputKind === "choice") {
    const isCorrect = input === question.answer;
    return {
      isCorrect,
      accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
    };
  }

  const actual = Number(input.replace("%", ""));
  const expected = Number(question.answer.replace("%", ""));
  if (!Number.isFinite(actual) || !Number.isFinite(expected))
    return { isCorrect: false, accuracyLevel: "wrong" as const };

  const epsilon = Number.EPSILON * Math.max(1, Math.abs(expected));
  if (Math.abs(actual - expected) <= epsilon)
    return { isCorrect: true, accuracyLevel: "exact" as const };

  if (
    question.acceptedRange &&
    actual >= question.acceptedRange.min &&
    actual <= question.acceptedRange.max
  )
    return { isCorrect: true, accuracyLevel: "accepted" as const };

  return { isCorrect: false, accuracyLevel: "wrong" as const };
}
