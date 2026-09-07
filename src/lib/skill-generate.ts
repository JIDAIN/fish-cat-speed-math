import { GenerationContext, productionGenerationContext } from "./generate";
import { getSkillDefinition } from "./skill-registry";
import {
  DifficultyBand,
  GeneratedQuestion,
  SkillId,
  StructuredInputKind,
  TargetPrecision,
} from "./types";

export const FOUNDATION_SKILL_GENERATOR_VERSION = "a-foundation-1.0.0";

export const foundationSkillIds = [
  "A-MUL-01",
  "A-MUL-02",
  "A-COM-01",
  "A-COM-02",
  "A-COM-03",
  "A-COM-04",
  "A-SPM-01",
  "A-SPM-02",
  "A-SPM-03",
  "A-SPM-04",
  "A-SPM-05",
  "A-SPM-06",
  "A-MAG-01",
  "A-MAG-02",
  "A-MAG-03",
  "A-PCT-01",
  "A-PCT-02",
  "A-PCT-03",
  "A-PCT-04",
  "A-PCT-05",
  "A-PCT-06",
  "A-PCT-07",
  "A-PCT-08",
  "A-PCT-09",
  "A-PCT-10",
  "A-PCT-11",
  "A-PCT-12",
  "A-PLACE-01",
  "A-PLACE-02",
  "A-PLACE-03",
  "A-PLACE-04",
  "A-PLACE-05",
  "A-PLACE-06",
] as const satisfies readonly SkillId[];

export type FoundationSkillId = (typeof foundationSkillIds)[number];

const foundationSkillSet = new Set<string>(foundationSkillIds);

export function isFoundationSkillId(value: unknown): value is FoundationSkillId {
  return typeof value === "string" && foundationSkillSet.has(value);
}

const randomInteger = (context: GenerationContext, min: number, max: number) =>
  Math.floor(context.random() * (max - min + 1)) + min;

const choose = <T>(context: GenerationContext, values: readonly T[]): T =>
  values[randomInteger(context, 0, values.length - 1)];

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
  skillId: FoundationSkillId;
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
  allowedAnswerSet?: GeneratedQuestion["allowedAnswerSet"];
  generatorParams?: GeneratedQuestion["generatorParams"];
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
      tags: ["基础自动化专项", ...structureTags],
    },
    primaryStructure: input.primaryStructure,
    secondaryTags: input.secondaryTags ?? [],
    generationRuleVersion: FOUNDATION_SKILL_GENERATOR_VERSION,
    skillId: input.skillId,
    secondarySkillIds: input.secondarySkillIds ?? [],
    difficultyBand: input.difficultyBand,
    structureTags,
    targetPrecision: input.targetPrecision ?? "exact",
    generatorParams: {
      generatorFamily: "a_foundation",
      ...(input.generatorParams ?? {}),
    },
    allowedAnswerSet: input.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind,
  };
}

function multiplicationFact(
  skillId: Extract<FoundationSkillId, "A-MUL-01" | "A-MUL-02">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const hardMinimum = difficultyBand === "L1" ? 2 : difficultyBand === "L2" ? 3 : 6;
  const a = randomInteger(context, hardMinimum, difficultyBand === "L1" ? 6 : 9);
  const b = randomInteger(context, hardMinimum, difficultyBand === "L1" ? 6 : 9);
  const product = a * b;
  const highFact = a >= 6 || b >= 6;

  if (skillId === "A-MUL-01") {
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${a}×${b}＝`,
      answer: String(product),
      data: { a, b, product },
      primaryStructure: highFact ? "high_fact_6_to_9" : "basic_fact_2_to_5",
      generatorParams: { factorA: a, factorB: b },
    });
  }

  const missingLeft = context.random() < 0.5;
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: missingLeft ? `□×${b}＝${product}` : `${a}×□＝${product}`,
    answer: String(missingLeft ? a : b),
    data: { a, b, product, missingSide: missingLeft ? "left" : "right" },
    primaryStructure: highFact ? "inverse_high_fact" : "inverse_basic_fact",
    secondarySkillIds: ["A-MUL-01"],
    generatorParams: { factorA: a, factorB: b, missingSide: missingLeft ? "left" : "right" },
  });
}

function complementQuestion(
  skillId: Extract<FoundationSkillId, `A-COM-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (skillId === "A-COM-01") {
    let value = randomInteger(context, 1, difficultyBand === "L1" ? 99 : 999);
    if (value % 10 === 0) value += value === 999 ? -1 : 1;
    const anchor = Math.ceil(value / 10) * 10;
    const delta = anchor - value;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 到下一个整十还差多少？`,
      answer: String(delta),
      data: { value, anchor, delta },
      primaryStructure: "next_ten_complement",
      generatorParams: { anchorUnit: 10, direction: "up" },
    });
  }

  if (skillId === "A-COM-02") {
    const anchor = randomInteger(context, 1, 99) * 100;
    const delta = randomInteger(
      context,
      difficultyBand === "L3" ? 35 : 1,
      difficultyBand === "L1" ? 25 : 49,
    );
    const direction = difficultyBand === "L1" ? "up" : context.random() < 0.5 ? "up" : "down";
    const value = direction === "up" ? anchor - delta : anchor + delta;
    const signedDelta = anchor - value;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 调到最近的整百，输入调整量（向上为正、向下为负）：`,
      answer: String(signedDelta),
      data: { value, anchor, delta, direction },
      primaryStructure: direction === "up" ? "nearest_hundred_up" : "nearest_hundred_down",
      generatorParams: { anchorUnit: 100, direction, absoluteDelta: delta },
    });
  }

  if (skillId === "A-COM-03") {
    const anchor = randomInteger(context, 1, 99) * 1000;
    const delta = randomInteger(
      context,
      difficultyBand === "L3" ? 120 : 1,
      difficultyBand === "L1" ? 99 : 199,
    );
    const direction = difficultyBand === "L1" ? "up" : context.random() < 0.5 ? "up" : "down";
    const value = direction === "up" ? anchor - delta : anchor + delta;
    const signedDelta = anchor - value;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 调到最近的整千，输入调整量（向上为正、向下为负）：`,
      answer: String(signedDelta),
      data: { value, anchor, delta, direction },
      primaryStructure: direction === "up" ? "nearest_thousand_up" : "nearest_thousand_down",
      generatorParams: { anchorUnit: 1000, direction, absoluteDelta: delta },
    });
  }

  const lower = randomInteger(context, 1, 98) * 100;
  let offset = randomInteger(
    context,
    difficultyBand === "L3" ? 45 : 10,
    difficultyBand === "L1" ? 35 : 90,
  );
  if (offset === 50) offset += 1;
  const value = lower + offset;
  const upper = lower + 100;
  const signedDelta = offset < 50 ? -offset : 100 - offset;
  const direction = signedDelta > 0 ? "up" : "down";
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${value} 位于 ${lower} 和 ${upper} 之间。选更省的方向，输入最小调整量（向上为正、向下为负）：`,
    answer: String(signedDelta),
    data: { value, lowerAnchor: lower, upperAnchor: upper, delta: Math.abs(signedDelta), direction },
    primaryStructure: difficultyBand === "L3" ? "two_anchor_near_midpoint" : "two_anchor_direction",
    generatorParams: { lowerAnchor: lower, upperAnchor: upper, direction },
  });
}

const specialMultiplierBySkill: Record<
  Extract<FoundationSkillId, `A-SPM-${string}`>,
  number
> = {
  "A-SPM-01": 5,
  "A-SPM-02": 25,
  "A-SPM-03": 125,
  "A-SPM-04": 0.5,
  "A-SPM-05": 1.5,
  "A-SPM-06": 2.5,
};

function specialMultiplierQuestion(
  skillId: Extract<FoundationSkillId, `A-SPM-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const multiplier = specialMultiplierBySkill[skillId];
  let value: number;
  if (difficultyBand === "L1") {
    const base = randomInteger(context, 2, 99);
    value = multiplier === 125 ? base * 8 : multiplier === 25 ? base * 4 : base * 2;
  } else if (difficultyBand === "L3") {
    value = randomInteger(context, 100, 99990) / 10;
  } else {
    value = randomInteger(context, 10, 9999);
  }
  const result = value * multiplier;
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${cleanNumber(value)}×${cleanNumber(multiplier)}＝`,
    answer: cleanNumber(result),
    acceptedRange: acceptedAround(result, 0.1),
    data: { value, multiplier, result },
    primaryStructure: difficultyBand === "L3" ? "special_multiplier_decimal" : "special_multiplier_standard",
    targetPrecision: "range",
    generatorParams: { value, multiplier },
  });
}

function magnitudeQuestion(
  skillId: Extract<FoundationSkillId, `A-MAG-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const denominator = randomInteger(context, difficultyBand === "L1" ? 20 : 73, 999);
  const multiplier = randomInteger(context, difficultyBand === "L3" ? 6 : 2, 9);
  if (skillId === "A-MAG-01") {
    const result = denominator * multiplier;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${denominator}×${multiplier}＝`,
      answer: String(result),
      data: { denominator, multiplier, result },
      primaryStructure: multiplier >= 7 ? "high_integer_multiple" : "integer_multiple",
      secondarySkillIds: ["A-MUL-02"],
      generatorParams: { denominator, multiplier },
    });
  }

  const scale = choose(context, difficultyBand === "L1" ? [10] : [10, 100] as const);
  if (skillId === "A-MAG-02") {
    const result = denominator * multiplier * scale;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${denominator}×${multiplier}×${scale}＝`,
      answer: String(result),
      data: { denominator, multiplier, scale, result },
      primaryStructure: scale === 100 ? "multiple_then_hundred_shift" : "multiple_then_ten_shift",
      secondarySkillIds: ["A-PLACE-01"],
      generatorParams: { denominator, multiplier, scale },
    });
  }

  const combinedMultiplier = multiplier * scale;
  const result = denominator * combinedMultiplier;
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${result}＝${denominator}×□，□＝`,
    answer: String(combinedMultiplier),
    data: { denominator, multiplier, scale, result, combinedMultiplier },
    primaryStructure: "reverse_scaled_multiple",
    secondarySkillIds: ["A-MUL-02", "A-PLACE-01"],
    generatorParams: { denominator, multiplier, scale },
  });
}

const percentBySkill: Record<
  Extract<FoundationSkillId, `A-PCT-${string}`>,
  { label: string; ratio: number }
> = {
  "A-PCT-01": { label: "0.1%", ratio: 0.001 },
  "A-PCT-02": { label: "1%", ratio: 0.01 },
  "A-PCT-03": { label: "2%", ratio: 0.02 },
  "A-PCT-04": { label: "2.5%", ratio: 0.025 },
  "A-PCT-05": { label: "3%", ratio: 0.03 },
  "A-PCT-06": { label: "5%", ratio: 0.05 },
  "A-PCT-07": { label: "10%", ratio: 0.1 },
  "A-PCT-08": { label: "12.5%", ratio: 0.125 },
  "A-PCT-09": { label: "20%", ratio: 0.2 },
  "A-PCT-10": { label: "25%", ratio: 0.25 },
  "A-PCT-11": { label: "33.3%（按1/3）", ratio: 1 / 3 },
  "A-PCT-12": { label: "50%", ratio: 0.5 },
};

function percentageQuestion(
  skillId: Extract<FoundationSkillId, `A-PCT-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const { label, ratio } = percentBySkill[skillId];
  let value =
    difficultyBand === "L1"
      ? randomInteger(context, 1, 99) * 100
      : randomInteger(context, 100, 9999);
  if (difficultyBand === "L3" && value % 10 === 0) value += 3;
  const result = value * ratio;
  const isExactHalf = skillId === "A-PCT-12";
  const tolerance = Math.max(Math.abs(result) * 0.005, 0.1);
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `求 ${value} 的 ${label}：`,
    answer: cleanNumber(result),
    acceptedRange: isExactHalf ? undefined : acceptedAround(result, tolerance),
    data: { value, ratio, percentLabel: label, result },
    primaryStructure:
      difficultyBand === "L1" ? "friendly_percent_block" : difficultyBand === "L3" ? "non_round_percent_block" : "standard_percent_block",
    secondarySkillIds: skillId === "A-PCT-02" ? ["A-PLACE-03"] : [],
    targetPrecision: isExactHalf ? "exact" : "range",
    generatorParams: { value, ratio, percentLabel: label },
  });
}

function placeQuestion(
  skillId: Extract<FoundationSkillId, `A-PLACE-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (skillId === "A-PLACE-01" || skillId === "A-PLACE-02") {
    const power = randomInteger(context, 1, difficultyBand === "L1" ? 2 : 3);
    const scale = 10 ** power;
    const base =
      difficultyBand === "L3"
        ? randomInteger(context, 11, 9999) / 10
        : randomInteger(context, 1, 9999);
    const result = skillId === "A-PLACE-01" ? base * scale : base / scale;
    const operator = skillId === "A-PLACE-01" ? "×" : "÷";
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${cleanNumber(base)}${operator}${scale}＝`,
      answer: cleanNumber(result),
      data: { base, scale, power, result },
      primaryStructure: skillId === "A-PLACE-01" ? "decimal_shift_right" : "decimal_shift_left",
      generatorParams: { base, scale, power },
    });
  }

  if (skillId === "A-PLACE-03") {
    const value = randomInteger(context, 1, 99999);
    const result = value / 100;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 的 1% ＝`,
      answer: cleanNumber(result),
      data: { value, result },
      primaryStructure: value % 100 === 0 ? "one_percent_integer" : "one_percent_decimal",
      generatorParams: { value },
    });
  }

  if (skillId === "A-PLACE-04") {
    const percentTenths = randomInteger(context, 1, 999);
    const percent = percentTenths / 10;
    const decimal = percent / 100;
    const percentToDecimal = context.random() < 0.5;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: percentToDecimal
        ? `${cleanNumber(percent, 1)}% ＝ ?（小数）`
        : `${cleanNumber(decimal, 4)} ＝ ?%（只填数字）`,
      answer: cleanNumber(percentToDecimal ? decimal : percent, 4),
      data: { percent, decimal, direction: percentToDecimal ? "percent_to_decimal" : "decimal_to_percent" },
      primaryStructure: percentToDecimal ? "percent_to_decimal" : "decimal_to_percent",
      generatorParams: { direction: percentToDecimal ? "percent_to_decimal" : "decimal_to_percent", percent, decimal },
    });
  }

  if (skillId === "A-PLACE-05") {
    const a = randomInteger(context, difficultyBand === "L1" ? 11 : 73, difficultyBand === "L3" ? 9999 : 999);
    const b = randomInteger(context, 2, 9);
    const result = a * b;
    const answer =
      result < 10 ? "个" : result < 100 ? "十" : result < 1000 ? "百" : result < 10000 ? "千" : "万";
    const choices = ["个", "十", "百", "千", "万"];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `不精确计算，判断 ${a}×${b} 的结果量级：`,
      answer,
      data: { a, b, result, choiceValues: choices, choiceLabels: choices },
      primaryStructure: "magnitude_category",
      targetPrecision: "magnitude",
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { a, b },
    });
  }

  const coefficient = randomInteger(context, 11, 9999) / 100;
  const exponentCandidates = difficultyBand === "L1" ? [-1, 1] : difficultyBand === "L2" ? [-2, -1, 1, 2] : [-3, -2, 2, 3];
  const exponent = choose(context, exponentCandidates);
  const result = coefficient * 10 ** exponent;
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${cleanNumber(coefficient, 2)}×10^${exponent}＝`,
    answer: cleanNumber(result, 6),
    data: { coefficient, exponent, result },
    primaryStructure: exponent > 0 ? "power_shift_right" : "power_shift_left",
    generatorParams: { coefficient, exponent },
  });
}

export function generateFoundationSkillQuestion(
  skillId: FoundationSkillId,
  difficultyBand: DifficultyBand,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (skillId === "A-MUL-01" || skillId === "A-MUL-02")
    return multiplicationFact(skillId, difficultyBand, context);
  if (skillId.startsWith("A-COM-"))
    return complementQuestion(
      skillId as Extract<FoundationSkillId, `A-COM-${string}`>,
      difficultyBand,
      context,
    );
  if (skillId.startsWith("A-SPM-"))
    return specialMultiplierQuestion(
      skillId as Extract<FoundationSkillId, `A-SPM-${string}`>,
      difficultyBand,
      context,
    );
  if (skillId.startsWith("A-MAG-"))
    return magnitudeQuestion(
      skillId as Extract<FoundationSkillId, `A-MAG-${string}`>,
      difficultyBand,
      context,
    );
  if (skillId.startsWith("A-PCT-"))
    return percentageQuestion(
      skillId as Extract<FoundationSkillId, `A-PCT-${string}`>,
      difficultyBand,
      context,
    );
  return placeQuestion(
    skillId as Extract<FoundationSkillId, `A-PLACE-${string}`>,
    difficultyBand,
    context,
  );
}

export function generateFoundationSkillSet(
  skillId: FoundationSkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    generateFoundationSkillQuestion(skillId, difficultyBand, context),
  );
}

export function gradeFoundationSkillQuestion(
  questionToGrade: GeneratedQuestion,
  input: string,
) {
  if (questionToGrade.type !== "skill_drill")
    throw new Error("Only skill_drill questions can use the foundation grader.");

  if (questionToGrade.inputKind === "choice") {
    const isCorrect = input === questionToGrade.answer;
    return {
      isCorrect,
      accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
    };
  }

  const actual = Number(input.replace("%", ""));
  const expected = Number(questionToGrade.answer.replace("%", ""));
  if (!Number.isFinite(actual) || !Number.isFinite(expected))
    return { isCorrect: false, accuracyLevel: "wrong" as const };

  const epsilon = Number.EPSILON * Math.max(1, Math.abs(expected));
  const exact = Math.abs(actual - expected) <= epsilon;
  if (exact) return { isCorrect: true, accuracyLevel: "exact" as const };

  const range = questionToGrade.acceptedRange;
  const accepted =
    range !== undefined && actual >= range.min && actual <= range.max;
  return {
    isCorrect: accepted,
    accuracyLevel: accepted ? ("accepted" as const) : ("wrong" as const),
  };
}
