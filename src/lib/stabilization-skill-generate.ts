import {
  FRACTION_PERCENT_LIBRARY,
  GenerationContext,
  productionGenerationContext,
} from "./generate";
import { getSkillDefinition } from "./skill-registry";
import {
  AnswerValue,
  DifficultyBand,
  GeneratedQuestion,
  QuestionStepSpec,
  SkillId,
  StructuredInputKind,
  TargetPrecision,
} from "./types";

export const STABILIZATION_SKILL_GENERATOR_VERSION = "layer1-stabilization-1.0.0";

export const stabilizationSkillIds = [
  "A-MUL-03",
  "A-MUL-04",
  "A-MUL-05",
  "A-MUL-06",
  "A-MUL-07",
  "A-ADD-01",
  "A-SUB-01",
  "A-SUB-02",
  "A-SUB-03",
  "A-SUB-04",
  "A-SUB-05",
  "A-FRA-01",
  "A-FRA-02",
  "A-FRA-03",
  "A-FRA-04",
  "C-MUL-01",
  "C-DIV-01",
  "C-DIV-02",
  "C-DIV-03",
  "C-DIV-04",
] as const satisfies readonly SkillId[];

export type StabilizationSkillId = (typeof stabilizationSkillIds)[number];

const stabilizationSkillSet = new Set<string>(stabilizationSkillIds);

export function isStabilizationSkillId(value: unknown): value is StabilizationSkillId {
  return typeof value === "string" && stabilizationSkillSet.has(value);
}

const randomInteger = (context: GenerationContext, min: number, max: number) =>
  Math.floor(context.random() * (max - min + 1)) + min;

const choose = <T>(context: GenerationContext, values: readonly T[]): T =>
  values[randomInteger(context, 0, values.length - 1)];

const shuffle = <T>(context: GenerationContext, values: readonly T[]): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInteger(context, 0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const bandLevel: Record<DifficultyBand, 2 | 3 | 5> = {
  L1: 2,
  L2: 3,
  L3: 5,
};

function cleanNumber(value: number, decimals = 6): string {
  const rounded = Number(value.toFixed(decimals));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function acceptedAround(value: number, tolerance: number) {
  const epsilon = Number.EPSILON * Math.max(1, Math.abs(value));
  return { min: value - tolerance - epsilon, max: value + tolerance + epsilon };
}

function question(input: {
  context: GenerationContext;
  skillId: StabilizationSkillId;
  difficultyBand: DifficultyBand;
  prompt: string;
  answer: string;
  data?: GeneratedQuestion["data"];
  primaryStructure: string;
  secondaryTags?: string[];
  secondarySkillIds?: SkillId[];
  targetPrecision?: TargetPrecision;
  acceptedRange?: GeneratedQuestion["acceptedRange"];
  inputKind?: StructuredInputKind;
  allowedAnswerSet?: AnswerValue[];
  generatorParams?: GeneratedQuestion["generatorParams"];
  stepSpecs?: QuestionStepSpec[];
}): GeneratedQuestion {
  const definition = getSkillDefinition(input.skillId);
  const inputKind = input.inputKind ?? definition.inputKind;
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
      tags: ["第一层稳定化专项", ...structureTags],
    },
    primaryStructure: input.primaryStructure,
    secondaryTags: input.secondaryTags ?? [],
    generationRuleVersion: STABILIZATION_SKILL_GENERATOR_VERSION,
    skillId: input.skillId,
    secondarySkillIds: input.secondarySkillIds ?? [],
    difficultyBand: input.difficultyBand,
    structureTags,
    targetPrecision: input.targetPrecision ?? "exact",
    generatorParams: {
      generatorFamily: "layer1_stabilization",
      ...(input.generatorParams ?? {}),
    },
    allowedAnswerSet: input.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind,
    stepSpecs: input.stepSpecs,
  };
}

function multiplicationProfile(a: number, b: number) {
  const onesProduct = (a % 10) * (b % 10);
  const middleTotal =
    Math.floor(a / 10) * (b % 10) +
    (a % 10) * Math.floor(b / 10) +
    Math.floor(onesProduct / 10);
  const onesCarry = onesProduct >= 10;
  const middleCarry = middleTotal >= 10;
  const highCarry = middleTotal >= 100;
  return {
    onesCarry,
    middleCarry,
    highCarry,
    carryCount: Number(onesCarry) + Number(middleCarry) + Number(highCarry),
  };
}

function multiplicationQuestion(
  skillId: Extract<StabilizationSkillId, `A-MUL-${string}` | "C-MUL-01">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (skillId === "A-MUL-03") {
    const min = difficultyBand === "L1" ? 12 : difficultyBand === "L2" ? 24 : 47;
    const a = randomInteger(context, min, 99);
    const b = randomInteger(context, difficultyBand === "L3" ? 6 : 2, 9);
    const profile = multiplicationProfile(a, b);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${a}×${b}＝`,
      answer: String(a * b),
      data: { a, b, carryCount: profile.carryCount },
      primaryStructure:
        profile.carryCount === 0
          ? "two_by_one_no_carry"
          : profile.carryCount === 1
            ? "two_by_one_single_carry"
            : "two_by_one_multi_carry",
      secondarySkillIds: ["A-MUL-01"],
      generatorParams: { a, b, carryCount: profile.carryCount },
      inputKind: "number",
    });
  }

  if (skillId === "C-MUL-01") {
    const lower = difficultyBand === "L1" ? 11 : difficultyBand === "L2" ? 21 : 37;
    const a = randomInteger(context, lower, 99);
    const b = randomInteger(context, lower, 99);
    const profile = multiplicationProfile(a, b);
    const secondary =
      profile.carryCount === 0
        ? "A-MUL-04"
        : profile.carryCount === 1 && profile.onesCarry
          ? "A-MUL-05"
          : profile.carryCount === 1
            ? "A-MUL-06"
            : "A-MUL-07";
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${a}×${b}＝`,
      answer: String(a * b),
      data: { a, b, carryCount: profile.carryCount },
      primaryStructure: "two_by_two_complete",
      secondaryTags: [
        profile.onesCarry ? "ones_carry" : "ones_no_carry",
        profile.middleCarry ? "middle_carry" : "middle_no_carry",
      ],
      secondarySkillIds: [secondary],
      generatorParams: { a, b, carryCount: profile.carryCount },
      inputKind: "number",
    });
  }

  const fallback: Record<string, [number, number]> = {
    "A-MUL-04": [11, 14],
    "A-MUL-05": [13, 15],
    "A-MUL-06": [11, 29],
    "A-MUL-07": [12, 19],
  };
  let selected = fallback[skillId];
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const minimum = difficultyBand === "L1" ? 11 : difficultyBand === "L2" ? 17 : 31;
    const a = randomInteger(context, minimum, 99);
    const b = randomInteger(context, minimum, 99);
    if (a % 10 === 0 || b % 10 === 0) continue;
    const profile = multiplicationProfile(a, b);
    const matches =
      skillId === "A-MUL-04"
        ? profile.carryCount === 0
        : skillId === "A-MUL-05"
          ? profile.onesCarry && !profile.middleCarry && !profile.highCarry
          : skillId === "A-MUL-06"
            ? !profile.onesCarry && profile.middleCarry && !profile.highCarry
            : profile.carryCount >= 2;
    if (matches) {
      selected = [a, b];
      break;
    }
  }
  const [a, b] = selected;
  const profile = multiplicationProfile(a, b);
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${a}×${b}＝`,
    answer: String(a * b),
    data: {
      a,
      b,
      carryCount: profile.carryCount,
      onesCarry: profile.onesCarry,
      middleCarry: profile.middleCarry,
      highCarry: profile.highCarry,
    },
    primaryStructure:
      skillId === "A-MUL-04"
        ? "two_by_two_no_complex_carry"
        : skillId === "A-MUL-05"
          ? "ones_product_carry"
          : skillId === "A-MUL-06"
            ? "middle_accumulation_carry"
            : "continuous_multi_carry",
    secondarySkillIds: ["A-MUL-01"],
    generatorParams: { a, b, carryCount: profile.carryCount },
    inputKind: "number",
  });
}

function additionCarryCount(a: number, b: number) {
  let left = a;
  let right = b;
  let carry = 0;
  let count = 0;
  while (left > 0 || right > 0) {
    const sum = (left % 10) + (right % 10) + carry;
    carry = sum >= 10 ? 1 : 0;
    if (carry) count += 1;
    left = Math.floor(left / 10);
    right = Math.floor(right / 10);
  }
  return count;
}

function additionQuestion(difficultyBand: DifficultyBand, context: GenerationContext) {
  const digits = difficultyBand === "L1" ? randomInteger(context, 2, 3) : difficultyBand === "L2" ? randomInteger(context, 3, 4) : randomInteger(context, 4, 5);
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  const desiredMinimumCarries = difficultyBand === "L1" ? 0 : difficultyBand === "L2" ? 1 : 2;
  let a = min;
  let b = min;
  let carries = 0;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidateA = randomInteger(context, min, max);
    const candidateB = randomInteger(context, min, max);
    const candidateCarries = additionCarryCount(candidateA, candidateB);
    if (candidateCarries >= desiredMinimumCarries) {
      a = candidateA;
      b = candidateB;
      carries = candidateCarries;
      break;
    }
  }
  if (a === min && b === min) {
    [a, b] = difficultyBand === "L1" ? [234, 321] : difficultyBand === "L2" ? [684, 257] : [48765, 27689];
    carries = additionCarryCount(a, b);
  }
  return question({
    context,
    skillId: "A-ADD-01",
    difficultyBand,
    prompt: `${a}＋${b}＝`,
    answer: String(a + b),
    data: { a, b, carryCount: carries },
    primaryStructure:
      carries === 0 ? "addition_no_carry" : carries === 1 ? "addition_single_carry" : "addition_multi_carry",
    generatorParams: { a, b, digitCount: Math.max(String(a).length, String(b).length), carryCount: carries },
    inputKind: "number",
  });
}

function subtractionBorrowProfile(a: number, b: number) {
  let left = a;
  let right = b;
  let borrow = 0;
  let borrowCount = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  let crossedZero = false;
  while (left > 0 || right > 0) {
    const originalDigit = left % 10;
    const leftDigit = originalDigit - borrow;
    const rightDigit = right % 10;
    const nextBorrow = leftDigit < rightDigit ? 1 : 0;
    if (nextBorrow) {
      borrowCount += 1;
      consecutive += 1;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
      if (originalDigit === 0 || (borrow === 1 && originalDigit === 0)) crossedZero = true;
    } else {
      consecutive = 0;
    }
    borrow = nextBorrow;
    left = Math.floor(left / 10);
    right = Math.floor(right / 10);
  }
  return { borrowCount, maxConsecutive, crossedZero };
}

const subtractionFallbacks: Record<Exclude<Extract<StabilizationSkillId, `A-SUB-${string}`>, never>, Record<DifficultyBand, [number, number]>> = {
  "A-SUB-01": { L1: [84, 31], L2: [684, 257], L3: [58342, 17689] },
  "A-SUB-02": { L1: [52, 27], L2: [683, 254], L3: [6842, 2537] },
  "A-SUB-03": { L1: [621, 143], L2: [7421, 2538], L3: [86421, 27538] },
  "A-SUB-04": { L1: [1003, 487], L2: [5004, 1786], L3: [20004, 7869] },
  "A-SUB-05": { L1: [5312, 2786], L2: [53102, 27846], L3: [80401, 37658] },
};

function subtractionQuestion(
  skillId: Extract<StabilizationSkillId, `A-SUB-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  let [a, b] = subtractionFallbacks[skillId][difficultyBand];
  const digits = difficultyBand === "L1" ? 2 : difficultyBand === "L2" ? 4 : 5;
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  if (skillId === "A-SUB-01") {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidateA = randomInteger(context, min, max);
      const candidateB = randomInteger(context, Math.floor(min / 2), candidateA - 1);
      if (candidateB > 0) {
        a = candidateA;
        b = candidateB;
        break;
      }
    }
  } else if (skillId === "A-SUB-02") {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidateA = randomInteger(context, min, max);
      const candidateB = randomInteger(context, Math.floor(min / 2), candidateA - 1);
      if (candidateB <= 0) continue;
      const profile = subtractionBorrowProfile(candidateA, candidateB);
      if (profile.borrowCount === 1) {
        a = candidateA;
        b = candidateB;
        break;
      }
    }
  }
  const profile = subtractionBorrowProfile(a, b);
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${a}－${b}＝`,
    answer: String(a - b),
    data: {
      a,
      b,
      borrowCount: profile.borrowCount,
      maxConsecutiveBorrow: profile.maxConsecutive,
      crossedZero: profile.crossedZero,
    },
    primaryStructure:
      skillId === "A-SUB-01"
        ? "subtraction_baseline"
        : skillId === "A-SUB-02"
          ? "single_borrow"
          : skillId === "A-SUB-03"
            ? "consecutive_borrow"
            : skillId === "A-SUB-04"
              ? "borrow_across_zero"
              : "multi_position_borrow_mix",
    secondaryTags: [
      `borrow_count_${profile.borrowCount}`,
      ...(profile.crossedZero ? ["cross_zero"] : []),
    ],
    generatorParams: {
      a,
      b,
      borrowCount: profile.borrowCount,
      maxConsecutiveBorrow: profile.maxConsecutive,
      crossedZero: profile.crossedZero,
    },
    inputKind: "number",
  });
}

type ChoiceOption = { value: string; label: string };

function fractionChoiceData(
  data: GeneratedQuestion["data"],
  options: readonly ChoiceOption[],
): GeneratedQuestion["data"] {
  return {
    ...data,
    choiceValues: options.map((option) => option.value),
    choiceLabels: options.map((option) => option.label),
  };
}

const unitRelations = FRACTION_PERCENT_LIBRARY.filter(
  (relation) => relation.numerator === 1 && relation.denominator >= 2 && relation.denominator <= 9,
);
const nonUnitRelations = FRACTION_PERCENT_LIBRARY.filter(
  (relation) => relation.numerator > 1,
);

function fractionQuestion(
  skillId: Extract<StabilizationSkillId, `A-FRA-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const pool = skillId === "A-FRA-01" ? unitRelations : nonUnitRelations;
  const relation = choose(context, pool);
  const fraction = `${relation.numerator}/${relation.denominator}`;
  const percent = relation.percentAnswer;
  const fractionToPercent =
    skillId === "A-FRA-04" ||
    ((skillId === "A-FRA-01" || skillId === "A-FRA-02") && context.random() < 0.5);

  if (fractionToPercent) {
    const expected = Number(percent);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${fraction} ≈ ___%`,
      answer: percent,
      data: { numerator: relation.numerator, denominator: relation.denominator, percentAnswer: percent },
      primaryStructure: relation.numerator === 1 ? "unit_fraction_to_percent" : "non_unit_fraction_to_percent",
      acceptedRange: acceptedAround(expected, 0.1),
      targetPrecision: "range",
      generatorParams: { direction: "fraction_to_percent", fraction, percent },
      inputKind: "number",
    });
  }

  const sourcePercent = skillId === "A-FRA-03" ? Number(percent) : Number(percent);
  const distractors = (skillId === "A-FRA-03" ? FRACTION_PERCENT_LIBRARY : pool)
    .filter(
      (candidate) =>
        candidate.numerator !== relation.numerator || candidate.denominator !== relation.denominator,
    )
    .sort(
      (left, right) =>
        Math.abs(Number(left.percentAnswer) - sourcePercent) -
        Math.abs(Number(right.percentAnswer) - sourcePercent),
    )
    .slice(0, 3)
    .map((candidate) => `${candidate.numerator}/${candidate.denominator}`);
  const options = shuffle(
    context,
    [fraction, ...distractors].map((value) => ({ value, label: value })),
  );
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${percent}% 最接近哪个固定高频分数？`,
    answer: fraction,
    data: fractionChoiceData(
      { numerator: relation.numerator, denominator: relation.denominator, percentAnswer: percent },
      options,
    ),
    primaryStructure: skillId === "A-FRA-03" ? "percent_to_nearest_fixed_fraction" : "fixed_percent_to_fraction",
    inputKind: "choice",
    allowedAnswerSet: [fraction],
    generatorParams: { direction: "percent_to_fraction", fraction, percent },
  });
}

function roundToSignificant(value: number, digits: number) {
  if (value === 0) return 0;
  const scale = 10 ** (Math.floor(Math.log10(Math.abs(value))) - digits + 1);
  return Math.round(value / scale) * scale;
}

function leadingSignificantDigits(value: number, digits: number) {
  if (value === 0) return "0";
  const scale = 10 ** (Math.floor(Math.log10(Math.abs(value))) - digits + 1);
  return String(Math.floor(Math.abs(value) / scale));
}

function quotientRange(value: number) {
  if (value < 10) return "1-9";
  if (value < 100) return "10-99";
  return "100-999";
}

function divisionOperands(
  skillId: Extract<StabilizationSkillId, "C-DIV-01" | "C-DIV-02" | "C-DIV-03">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const config =
    skillId === "C-DIV-01"
      ? { aMin: 100, aMax: 999, bMin: 10, bMax: 99, qMin: 2, qMax: 99 }
      : skillId === "C-DIV-02"
        ? { aMin: 1000, aMax: 9999, bMin: 10, bMax: 99, qMin: 10, qMax: 999 }
        : { aMin: 10000, aMax: 99999, bMin: 100, bMax: 999, qMin: 10, qMax: 999 };
  const bandQMax = difficultyBand === "L1" ? Math.min(config.qMax, 99) : config.qMax;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const divisor = randomInteger(context, config.bMin, config.bMax);
    const quotientFloor = randomInteger(context, config.qMin, bandQMax);
    const remainder = randomInteger(context, 1, divisor - 1);
    const dividend = divisor * quotientFloor + remainder;
    if (dividend < config.aMin || dividend > config.aMax) continue;
    return { dividend, divisor, quotient: dividend / divisor };
  }
  if (skillId === "C-DIV-01") return { dividend: 523, divisor: 47, quotient: 523 / 47 };
  if (skillId === "C-DIV-02") return { dividend: 8125, divisor: 79, quotient: 8125 / 79 };
  return { dividend: 81256, divisor: 395, quotient: 81256 / 395 };
}

function divisionQuestion(
  skillId: Extract<StabilizationSkillId, "C-DIV-01" | "C-DIV-02" | "C-DIV-03">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const { dividend, divisor, quotient } = divisionOperands(skillId, difficultyBand, context);
  const approximation = roundToSignificant(quotient, difficultyBand === "L1" ? 1 : 2);
  const tolerance = Math.abs(quotient) * 0.03;
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${dividend}÷${divisor} ≈（控制在3%以内）`,
    answer: cleanNumber(approximation, 4),
    data: { dividend, divisor, quotient, approximation },
    primaryStructure:
      skillId === "C-DIV-01"
        ? "three_digit_by_two_digit"
        : skillId === "C-DIV-02"
          ? "four_digit_by_two_digit"
          : "five_digit_by_three_digit",
    secondarySkillIds: ["C-DIV-11", "C-DIV-12", "C-DIV-13"],
    targetPrecision: "3%",
    acceptedRange: acceptedAround(quotient, tolerance),
    generatorParams: { dividend, divisor, quotient, significantDigits: difficultyBand === "L1" ? 1 : 2 },
    inputKind: "number",
  });
}

function fullDirectDivisionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const sourceSkill = choose(
    context,
    difficultyBand === "L1"
      ? (["C-DIV-01"] as const)
      : difficultyBand === "L2"
        ? (["C-DIV-01", "C-DIV-02"] as const)
        : (["C-DIV-01", "C-DIV-02", "C-DIV-03"] as const),
  );
  const { dividend, divisor, quotient } = divisionOperands(sourceSkill, difficultyBand, context);
  const firstDigit = leadingSignificantDigits(quotient, 1);
  const firstTwoDigits = leadingSignificantDigits(quotient, 2);
  const scale = 10 ** Math.floor(Math.log10(Math.abs(quotient)));
  const firstCoarse = Number(firstDigit) * scale;
  const firstRemainder = Math.max(0, dividend - divisor * firstCoarse);
  const trialOffset = difficultyBand === "L1" ? 0 : context.random() < 0.5 ? 1 : -1;
  const offTrial = Math.max(1, Math.min(9, Number(firstDigit) + trialOffset));
  const adjustmentSkill: SkillId =
    offTrial > Number(firstDigit) ? "C-DIV-07" : offTrial < Number(firstDigit) ? "C-DIV-08" : "C-DIV-06";
  const finalApproximation = roundToSignificant(quotient, 2);
  const relativeError = Math.abs(finalApproximation - quotient) / quotient;
  const stopDecision = relativeError <= 0.03 ? "stop" : "continue";
  const interval = quotientRange(quotient);
  const intervalChoices = [
    { value: "1-9", label: "1～9" },
    { value: "10-99", label: "10～99" },
    { value: "100-999", label: "100～999" },
  ];
  const stopChoices = [
    { value: "stop", label: "停止" },
    { value: "continue", label: "继续" },
  ];
  const stepSpecs: QuestionStepSpec[] = [
    {
      id: "range",
      stepSkillId: "C-DIV-05",
      stepType: "quotient_range",
      prompt: `先判断 ${dividend}÷${divisor} 的商量级：`,
      inputKind: "choice",
      expectedValue: interval,
      allowedAnswerSet: [interval],
      choices: intervalChoices,
    },
    {
      id: "trial",
      stepSkillId: "C-DIV-06",
      stepType: "trial_first_digit",
      prompt: `商的首位先试几？`,
      inputKind: "number",
      expectedValue: firstDigit,
    },
    {
      id: "adjust",
      stepSkillId: adjustmentSkill,
      stepType: "adjust_trial",
      prompt:
        offTrial === Number(firstDigit)
          ? `试商 ${offTrial} 合适，确认这一位：`
          : `若先试商 ${offTrial}，应调整到几？`,
      inputKind: "number",
      expectedValue: firstDigit,
    },
    {
      id: "remainder",
      stepSkillId: "C-DIV-09",
      stepType: "coarse_remainder",
      prompt: `首位粗商 ${cleanNumber(firstCoarse)} 后，剩余量约为：`,
      inputKind: "number",
      expectedValue: cleanNumber(firstRemainder),
    },
    {
      id: "two_digits",
      stepSkillId: "C-DIV-12",
      stepType: "leading_two_digits",
      prompt: `继续算出商的前两位有效数字（不写小数点位置，只填两位数字）：`,
      inputKind: "number",
      expectedValue: firstTwoDigits,
    },
    {
      id: "stop",
      stepSkillId: "C-DIV-13",
      stepType: "precision_stop",
      prompt: `当前约值 ${cleanNumber(finalApproximation, 4)}，目标相对误差≤3%，现在停止还是继续？`,
      inputKind: "choice",
      expectedValue: stopDecision,
      allowedAnswerSet: [stopDecision],
      choices: stopChoices,
      targetPrecision: "3%",
    },
  ];
  return question({
    context,
    skillId: "C-DIV-04",
    difficultyBand,
    prompt: `完整直除：${dividend}÷${divisor}`,
    answer: cleanNumber(finalApproximation, 4),
    data: {
      dividend,
      divisor,
      quotient,
      sourceSkill,
      firstDigit,
      firstTwoDigits,
      firstCoarse,
      firstRemainder,
      finalApproximation,
      relativeError,
    },
    primaryStructure: "complete_direct_division_flow",
    secondaryTags: [sourceSkill.toLowerCase()],
    secondarySkillIds: ["C-DIV-05", "C-DIV-06", adjustmentSkill, "C-DIV-09", "C-DIV-12", "C-DIV-13"],
    targetPrecision: "3%",
    inputKind: "steps",
    stepSpecs,
    generatorParams: { dividend, divisor, sourceSkill, finalApproximation, relativeError },
  });
}

export function generateStabilizationSkillQuestion(
  skillId: StabilizationSkillId,
  difficultyBand: DifficultyBand,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (skillId.startsWith("A-MUL-") || skillId === "C-MUL-01")
    return multiplicationQuestion(
      skillId as Extract<StabilizationSkillId, `A-MUL-${string}` | "C-MUL-01">,
      difficultyBand,
      context,
    );
  if (skillId === "A-ADD-01") return additionQuestion(difficultyBand, context);
  if (skillId.startsWith("A-SUB-"))
    return subtractionQuestion(
      skillId as Extract<StabilizationSkillId, `A-SUB-${string}`>,
      difficultyBand,
      context,
    );
  if (skillId.startsWith("A-FRA-"))
    return fractionQuestion(
      skillId as Extract<StabilizationSkillId, `A-FRA-${string}`>,
      difficultyBand,
      context,
    );
  if (skillId === "C-DIV-04") return fullDirectDivisionQuestion(difficultyBand, context);
  return divisionQuestion(
    skillId as Extract<StabilizationSkillId, "C-DIV-01" | "C-DIV-02" | "C-DIV-03">,
    difficultyBand,
    context,
  );
}

export function generateStabilizationSkillSet(
  skillId: StabilizationSkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    generateStabilizationSkillQuestion(skillId, difficultyBand, context),
  );
}

export function gradeStabilizationSkillQuestion(
  questionToGrade: GeneratedQuestion,
  input: string,
) {
  if (
    questionToGrade.type !== "skill_drill" ||
    !isStabilizationSkillId(questionToGrade.skillId)
  )
    throw new Error("Only stabilization skill drills can use this grader.");

  const normalizedInput = input.trim();
  const allowed = questionToGrade.allowedAnswerSet?.map(String) ?? [];
  if (allowed.includes(normalizedInput))
    return { isCorrect: true, accuracyLevel: "exact" as const };

  const actual = Number(normalizedInput.replace("%", ""));
  const expected = Number(questionToGrade.answer.replace("%", ""));
  if (Number.isFinite(actual) && Number.isFinite(expected)) {
    const epsilon = Number.EPSILON * Math.max(1, Math.abs(expected));
    if (Math.abs(actual - expected) <= epsilon)
      return { isCorrect: true, accuracyLevel: "exact" as const };
    const range = questionToGrade.acceptedRange;
    const accepted = range !== undefined && actual >= range.min && actual <= range.max;
    return {
      isCorrect: accepted,
      accuracyLevel: accepted ? ("accepted" as const) : ("wrong" as const),
    };
  }

  const isCorrect = normalizedInput === questionToGrade.answer;
  return {
    isCorrect,
    accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
  };
}
