import { GenerationContext, productionGenerationContext } from "./generate";
import { getSkillDefinition } from "./skill-registry";
import {
  AnswerValue,
  DifficultyBand,
  GeneratedQuestion,
  QuestionStepChoice,
  QuestionStepSpec,
  SkillId,
  StructuredInputKind,
  TargetPrecision,
} from "./types";

export const BATCH6_DIVISION_SCALE_GENERATOR_VERSION = "stage4-batch6-1.0.0";

export const batch6DivisionScaleSkillIds = [
  "C-DIVSCALE-01",
  "C-DIVSCALE-02",
  "C-DIVSCALE-03",
  "C-DIVSCALE-04",
  "C-DIVSCALE-05",
  "C-DIVSCALE-06",
  "C-DIVSCALE-07",
  "C-DIVSCALE-08",
  "C-DIVSCALE-09",
  "C-DIVSCALE-10",
  "C-DIVSCALE-11",
  "C-DIVSCALE-12",
  "C-DIVSCALE-13",
  "C-DIVSCALE-14",
  "C-DIVSCALE-15",
] as const satisfies readonly SkillId[];

export type Batch6DivisionScaleSkillId =
  (typeof batch6DivisionScaleSkillIds)[number];

const batch6SkillSet = new Set<string>(batch6DivisionScaleSkillIds);

export function isBatch6DivisionScaleSkillId(
  value: unknown,
): value is Batch6DivisionScaleSkillId {
  return typeof value === "string" && batch6SkillSet.has(value);
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
  return {
    min: value - tolerance - epsilon,
    max: value + tolerance + epsilon,
  };
}

function relativeRange(value: number, ratio: number) {
  return acceptedAround(value, Math.max(0.01, Math.abs(value) * ratio));
}

type ChoiceOption = QuestionStepChoice;

function choiceData(
  data: GeneratedQuestion["data"],
  options: readonly ChoiceOption[],
): GeneratedQuestion["data"] {
  return {
    ...data,
    choiceValues: options.map((option) => option.value),
    choiceLabels: options.map((option) => option.label),
  };
}

function question(input: {
  context: GenerationContext;
  skillId: Batch6DivisionScaleSkillId;
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
  stepSpecs?: QuestionStepSpec[];
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
      tags: ["除法补偿放缩", ...structureTags],
    },
    primaryStructure: input.primaryStructure,
    secondaryTags: input.secondaryTags ?? [],
    generationRuleVersion: BATCH6_DIVISION_SCALE_GENERATOR_VERSION,
    skillId: input.skillId,
    secondarySkillIds: input.secondarySkillIds ?? [],
    difficultyBand: input.difficultyBand,
    structureTags,
    targetPrecision: input.targetPrecision ?? "exact",
    generatorParams: {
      generatorFamily: "division_compensation_scaling",
      implementationBatch: "stage4_batch6",
      ...(input.generatorParams ?? {}),
    },
    allowedAnswerSet: input.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind,
    stepSpecs: input.stepSpecs,
  };
}

const anchors = [100, 125, 143, 167, 200, 250, 333, 400, 500, 625, 800] as const;

function baseForBand(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): number {
  const values =
    difficultyBand === "L1"
      ? ([100, 200, 400, 500, 800] as const)
      : difficultyBand === "L2"
        ? ([100, 125, 200, 250, 400, 500, 625, 800] as const)
        : anchors;
  return choose(context, values);
}

function rPercentForBand(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): number {
  return choose(
    context,
    difficultyBand === "L1"
      ? ([2, 3, 4, 5] as const)
      : difficultyBand === "L2"
        ? ([1, 2.5, 4, 6, 8] as const)
        : ([1, 3, 5, 7, 9, 10] as const),
  );
}

type ResultScaleScenario = {
  numerator: number;
  denominator: number;
  base: number;
  r: number;
  rPercent: number;
  q0: number;
  correction: number;
  q1: number;
  q2: number;
  correctionSign: 1 | -1;
};

function resultScaleScenario(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): ResultScaleScenario {
  let base = baseForBand(difficultyBand, context);
  let targetPercent = rPercentForBand(difficultyBand, context);
  const denominatorAboveBase = context.random() < 0.5;
  let denominator = Math.round(
    base * (1 + (denominatorAboveBase ? 1 : -1) * targetPercent / 100),
  );
  if (denominator < 100 || denominator > 999) {
    base = base >= 800 ? 500 : 400;
    targetPercent = Math.min(targetPercent, 8);
    denominator = Math.round(
      base * (1 + (denominatorAboveBase ? 1 : -1) * targetPercent / 100),
    );
  }
  const q0 = choose(
    context,
    difficultyBand === "L1"
      ? ([2, 3, 4, 5, 8, 10] as const)
      : difficultyBand === "L2"
        ? ([2.5, 4, 5, 8, 12, 20] as const)
        : ([1.5, 2.5, 4.5, 8, 12.5, 25] as const),
  );
  const numerator = base * q0;
  const r = Math.abs(denominator - base) / base;
  const correctionSign: 1 | -1 = base > denominator ? 1 : -1;
  const correction = correctionSign * q0 * r;
  const q1 = q0 + correction;
  const q2 = q1 + q0 * r * r;
  return {
    numerator,
    denominator,
    base,
    r,
    rPercent: r * 100,
    q0,
    correction,
    q1,
    q2,
    correctionSign,
  };
}

function obviousMultipleQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const denominator = randomInteger(context, 100, 499);
  const magnitude = choose(
    context,
    difficultyBand === "L1" ? ([1, 10] as const) : ([1, 10, 100] as const),
  );
  const multiplier = randomInteger(context, 2, 9) * magnitude;
  const baseNumerator = denominator * multiplier;
  const hasObvious = context.random() < 0.5;
  const deltaRatio = hasObvious
    ? choose(context, [-0.018, -0.009, 0.008, 0.016] as const)
    : choose(context, [0.12, 0.17, 0.23] as const);
  const numerator = Math.round(baseNumerator * (1 + deltaRatio));
  const answer = hasObvious ? "yes" : "no";
  const options = [
    { value: "yes", label: "有明显倍数入口" },
    { value: "no", label: "没有明显倍数入口" },
  ];
  return question({
    context,
    skillId: "C-DIVSCALE-01",
    difficultyBand,
    prompt: `快速扫描 ${numerator}÷${denominator}：是否存在非常接近分子的整倍数基准？`,
    answer,
    data: choiceData(
      {
        numerator,
        denominator,
        baseNumerator,
        baseQuotient: multiplier,
        deltaRatio,
      },
      options,
    ),
    primaryStructure: hasObvious
      ? "division_scale_obvious_multiple"
      : "division_scale_no_obvious_multiple",
    secondarySkillIds: ["A-MAG-01", "A-MAG-02", "A-MAG-03"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: {
      numerator,
      denominator,
      baseNumerator,
      baseQuotient: multiplier,
      deltaRatio,
      hasObviousMultiple: hasObvious,
    },
  });
}

function baseChoiceQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const bestBase = baseForBand(difficultyBand, context);
  const rPercent = rPercentForBand(difficultyBand, context);
  const sign = context.random() < 0.5 ? 1 : -1;
  let denominator = Math.round(bestBase * (1 + sign * rPercent / 100));
  if (denominator < 100 || denominator > 999) denominator = Math.round(bestBase * 0.96);
  const pool = anchors.filter(
    (value) => value !== bestBase && Math.abs(value - denominator) / denominator < 0.35,
  );
  const alternatives = shuffle(context, pool).slice(0, 3);
  const options = shuffle(
    context,
    [bestBase, ...alternatives].map((value) => ({
      value: String(value),
      label: String(value),
    })),
  );
  return question({
    context,
    skillId: "C-DIVSCALE-02",
    difficultyBand,
    prompt: `除数 D=${denominator}，选择附近明显更好算且改动不超过约10%的分母基准：`,
    answer: String(bestBase),
    data: choiceData({ denominator, bestBase }, options),
    primaryStructure: "division_scale_base_choice",
    secondarySkillIds: ["B-BASE-01", "B-BASE-02", "B-BASE-05"],
    inputKind: "choice",
    allowedAnswerSet: [String(bestBase)],
    generatorParams: {
      denominator,
      bestBase,
      deviationRatio: Math.abs(denominator - bestBase) / bestBase,
    },
  });
}

function worthQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const band = choose(context, ["preferred", "borderline", "exit"] as const);
  const rPercent =
    band === "preferred"
      ? choose(context, [2, 3, 4, 5] as const)
      : band === "borderline"
        ? choose(context, [6, 7, 8, 9, 10] as const)
        : choose(context, [11, 12, 15] as const);
  const clearBenefit =
    band === "borderline" ? context.random() < 0.5 : band === "preferred";
  const answer =
    rPercent <= 5 || (rPercent <= 10 && clearBenefit) ? "worth" : "exit";
  const options = [
    { value: "worth", label: "值得放缩" },
    { value: "exit", label: "不值得，退出分母基准型放缩" },
  ];
  return question({
    context,
    skillId: "C-DIVSCALE-03",
    difficultyBand,
    prompt: `D→B 的偏差约 ${rPercent}%，${clearBenefit ? "新基准明显降低计算成本" : "新基准只略微好算"}。是否值得使用分母基准型放缩？`,
    answer,
    data: choiceData({ rPercent, clearBenefit }, options),
    primaryStructure: `division_scale_worth_${band}`,
    secondarySkillIds: ["B-APP-05", "C-EST-10"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { rPercent, clearBenefit, decision: answer },
  });
}

const routeTemplates = [
  {
    route: "numerator" as const,
    numerator: 645,
    denominator: 122,
    base: 125,
    goodNumerator: 660,
  },
  {
    route: "result" as const,
    numerator: 750,
    denominator: 312,
    base: 300,
    goodNumerator: 720,
  },
  {
    route: "both" as const,
    numerator: 640,
    denominator: 196,
    base: 200,
    goodNumerator: 650,
  },
] as const;

function routeChoiceQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (difficultyBand === "L3") return fullCompensationFlowQuestion(context);
  const template = choose(context, routeTemplates);
  const options = [
    { value: "numerator", label: "修分子更省" },
    { value: "result", label: "修结果更省" },
    { value: "both", label: "两条都合理" },
  ];
  return question({
    context,
    skillId: "C-DIVSCALE-04",
    difficultyBand,
    prompt: `${template.numerator}÷${template.denominator}，已选基准 B=${template.base}。比较操作成本，补偿放在哪里更合适？`,
    answer: template.route,
    data: choiceData(
      {
        numerator: template.numerator,
        denominator: template.denominator,
        base: template.base,
      },
      options,
    ),
    primaryStructure: `division_scale_route_${template.route}`,
    secondarySkillIds: ["B-R-03", "B-RMUL-05", "B-BASE-05"],
    inputKind: "choice",
    allowedAnswerSet: [template.route],
    generatorParams: {
      numerator: template.numerator,
      denominator: template.denominator,
      base: template.base,
      preferredRoute: template.route,
    },
  });
}

function numeratorDirectionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const base = baseForBand(difficultyBand, context);
  const rPercent = rPercentForBand(difficultyBand, context);
  const baseAboveD = context.random() < 0.5;
  const denominator = Math.max(
    100,
    Math.min(
      999,
      Math.round(base * (1 + (baseAboveD ? -1 : 1) * rPercent / 100)),
    ),
  );
  const numerator = randomInteger(context, 300, 9000);
  const answer = base > denominator ? "increase" : "decrease";
  const options = [
    { value: "increase", label: "分子应增加" },
    { value: "decrease", label: "分子应减少" },
  ];
  return question({
    context,
    skillId: "C-DIVSCALE-05",
    difficultyBand,
    prompt: `原式 ${numerator}÷${denominator}，把分母改成 B=${base}。若走分子端补偿，分子应增还是减？`,
    answer,
    data: choiceData({ numerator, denominator, base }, options),
    primaryStructure: `division_scale_numerator_${answer}`,
    secondarySkillIds: ["C-EST-07"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { numerator, denominator, base, direction: answer },
  });
}

function numeratorAdjustmentQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const denominator = randomInteger(context, 100, 600);
  const q = randomInteger(context, 2, difficultyBand === "L3" ? 80 : 30);
  const diffPercent = rPercentForBand(difficultyBand, context);
  const sign = context.random() < 0.5 ? 1 : -1;
  const base = Math.max(
    80,
    Math.min(999, Math.round(denominator * (1 + sign * diffPercent / 100))),
  );
  const numerator = denominator * q;
  const idealAdjustment = (numerator * (base - denominator)) / denominator;
  const tolerance = Math.max(1, Math.abs(idealAdjustment) * 0.05);
  return question({
    context,
    skillId: "C-DIVSCALE-06",
    difficultyBand,
    prompt: `${numerator}÷${denominator}，分母准备改到 B=${base}。估计分子需要调整多少？增加填正数，减少填负数。`,
    answer: cleanNumber(idealAdjustment, 2),
    acceptedRange: acceptedAround(idealAdjustment, tolerance),
    data: { numerator, denominator, base, idealAdjustment },
    primaryStructure: "division_scale_numerator_adjustment",
    secondarySkillIds: ["A-MAG-01", "B-R-03"],
    inputKind: "number",
    targetPrecision: "range",
    generatorParams: {
      numerator,
      denominator,
      base,
      idealAdjustment,
      tolerance,
    },
  });
}

function niceNumeratorQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const base = choose(context, [100, 125, 200, 250, 400, 500] as const);
  const goodQuotient = choose(context, [2, 2.5, 3, 4, 5, 8, 10] as const);
  const goodNumerator = base * goodQuotient;
  const denominator = Math.round(base * choose(context, [0.96, 0.98, 1.02, 1.04] as const));
  const numerator = Math.round((goodNumerator * denominator) / base);
  const spread = difficultyBand === "L1" ? 10 : difficultyBand === "L2" ? 20 : 35;
  const optionsValues = [
    goodNumerator,
    goodNumerator - spread,
    goodNumerator + Math.round(spread * 0.6),
    goodNumerator + spread,
  ];
  const options = shuffle(
    context,
    optionsValues.map((value) => ({ value: String(value), label: String(value) })),
  );
  return question({
    context,
    skillId: "C-DIVSCALE-07",
    difficultyBand,
    prompt: `${numerator}÷${denominator} 已选 B=${base}。以下候选新分子都在调整量附近，哪个最好算且误差可控？`,
    answer: String(goodNumerator),
    data: choiceData({ numerator, denominator, base, goodNumerator }, options),
    primaryStructure: "division_scale_choose_nice_numerator",
    secondarySkillIds: ["A-COM-02", "B-APP-05"],
    inputKind: "choice",
    allowedAnswerSet: [String(goodNumerator)],
    generatorParams: { numerator, denominator, base, goodNumerator },
  });
}

function adjustedDivisionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const base = baseForBand(difficultyBand, context);
  const quotient = choose(
    context,
    difficultyBand === "L1"
      ? ([2, 3, 4, 5, 8] as const)
      : ([1.5, 2.5, 3.2, 4.5, 8.4] as const),
  );
  const adjustedNumerator = base * quotient;
  const toleranceRatio = difficultyBand === "L3" ? 0.01 : 0.005;
  return question({
    context,
    skillId: "C-DIVSCALE-08",
    difficultyBand,
    prompt: `分子已补偿为 ${cleanNumber(adjustedNumerator, 2)}，基准分母 B=${base}。完成新分子÷B：`,
    answer: cleanNumber(quotient, 4),
    acceptedRange: relativeRange(quotient, toleranceRatio),
    data: { adjustedNumerator, base, quotient },
    primaryStructure: "division_scale_adjusted_division",
    secondarySkillIds: ["C-DIV-12", "B-CONV-01"],
    inputKind: "number",
    targetPrecision: difficultyBand === "L3" ? "1%" : "exact",
    generatorParams: { adjustedNumerator, base, quotient, toleranceRatio },
  });
}

function resultRQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = resultScaleScenario(difficultyBand, context);
  const tolerance = difficultyBand === "L1" ? 0.05 : 0.1;
  return question({
    context,
    skillId: "C-DIVSCALE-09",
    difficultyBand,
    prompt: `结果端放缩：D=${scenario.denominator}，B=${scenario.base}。按 r=|D-B|/B 求 r（填百分数数字）：`,
    answer: cleanNumber(scenario.rPercent, 2),
    acceptedRange: acceptedAround(scenario.rPercent, tolerance),
    data: {
      denominator: scenario.denominator,
      base: scenario.base,
      rPercent: scenario.rPercent,
    },
    primaryStructure: "division_scale_result_r",
    secondarySkillIds: ["B-R-01", "B-R-03", "B-R-07"],
    inputKind: "number",
    targetPrecision: "range",
    generatorParams: {
      denominator: scenario.denominator,
      base: scenario.base,
      rPercent: scenario.rPercent,
      tolerancePercentPoints: tolerance,
    },
  });
}

function q0Question(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = resultScaleScenario(difficultyBand, context);
  return question({
    context,
    skillId: "C-DIVSCALE-10",
    difficultyBand,
    prompt: `结果端放缩：A=${cleanNumber(scenario.numerator, 2)}，B=${scenario.base}。先求 Q0=A/B：`,
    answer: cleanNumber(scenario.q0, 4),
    acceptedRange: relativeRange(scenario.q0, difficultyBand === "L3" ? 0.01 : 0.003),
    data: { numerator: scenario.numerator, base: scenario.base, q0: scenario.q0 },
    primaryStructure: "division_scale_q0",
    secondarySkillIds: ["C-DIV-12", "B-CONV-01"],
    inputKind: "number",
    targetPrecision: difficultyBand === "L3" ? "1%" : "exact",
    generatorParams: { numerator: scenario.numerator, base: scenario.base, q0: scenario.q0 },
  });
}

function firstCorrectionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = resultScaleScenario(difficultyBand, context);
  return question({
    context,
    skillId: "C-DIVSCALE-11",
    difficultyBand,
    prompt: `Q0=${cleanNumber(scenario.q0, 4)}，r=${cleanNumber(scenario.rPercent, 2)}%。求带符号的一阶修正量 Q0×r（增加填正，减少填负）：`,
    answer: cleanNumber(scenario.correction, 5),
    acceptedRange: relativeRange(scenario.correction, 0.02),
    data: {
      q0: scenario.q0,
      rPercent: scenario.rPercent,
      correction: scenario.correction,
    },
    primaryStructure: "division_scale_first_correction",
    secondarySkillIds: ["B-RMUL-02", "B-R-05"],
    inputKind: "number",
    targetPrecision: "range",
    generatorParams: {
      q0: scenario.q0,
      rPercent: scenario.rPercent,
      correction: scenario.correction,
    },
  });
}

function firstResultQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = resultScaleScenario(difficultyBand, context);
  return question({
    context,
    skillId: "C-DIVSCALE-12",
    difficultyBand,
    prompt: `Q0=${cleanNumber(scenario.q0, 4)}，一阶修正量=${cleanNumber(scenario.correction, 5)}。得到一阶结果 Q1：`,
    answer: cleanNumber(scenario.q1, 5),
    acceptedRange: relativeRange(scenario.q1, 0.01),
    data: { q0: scenario.q0, correction: scenario.correction, q1: scenario.q1 },
    primaryStructure: "division_scale_first_result",
    secondarySkillIds: ["A-ADD-01", "A-SUB-01"],
    inputKind: "number",
    targetPrecision: "1%",
    generatorParams: { q0: scenario.q0, correction: scenario.correction, q1: scenario.q1 },
  });
}

function secondOrderDecisionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const rPercent = choose(
    context,
    difficultyBand === "L1"
      ? ([3, 4, 5] as const)
      : difficultyBand === "L2"
        ? ([4, 6, 8] as const)
        : ([5, 7, 9, 10] as const),
  );
  const firstResidualPercent = (rPercent * rPercent) / 100;
  const optionGapPercent = choose(
    context,
    difficultyBand === "L1"
      ? ([2, 3] as const)
      : difficultyBand === "L2"
        ? ([0.8, 1.5, 2] as const)
        : ([0.4, 0.8, 1.2] as const),
  );
  const needSecond = firstResidualPercent > optionGapPercent / 2;
  const answer = needSecond ? "yes" : "no";
  const options = [
    { value: "no", label: "一阶够用，停止" },
    { value: "yes", label: "需要二阶继续压误差" },
  ];
  return question({
    context,
    skillId: "C-DIVSCALE-13",
    difficultyBand,
    prompt: `r=${rPercent}%，一阶残差量级约 r²=${cleanNumber(firstResidualPercent, 3)}%，候选间距约 ${optionGapPercent}%。是否需要二阶？`,
    answer,
    data: choiceData({ rPercent, firstResidualPercent, optionGapPercent }, options),
    primaryStructure: needSecond
      ? "division_scale_second_order_needed"
      : "division_scale_first_order_enough",
    secondarySkillIds: ["C-EST-10", "C-EST-11"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: {
      rPercent,
      firstResidualPercent,
      optionGapPercent,
      needSecond,
    },
  });
}

function secondCorrectionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = resultScaleScenario(difficultyBand, context);
  const secondCorrection = scenario.q0 * scenario.r * scenario.r;
  return question({
    context,
    skillId: "C-DIVSCALE-14",
    difficultyBand,
    prompt: `Q0=${cleanNumber(scenario.q0, 4)}，r=${cleanNumber(scenario.rPercent, 2)}%，一阶结果 Q1=${cleanNumber(scenario.q1, 5)}。加上 Q0×r² 后的 Q2＝`,
    answer: cleanNumber(scenario.q2, 5),
    acceptedRange: relativeRange(scenario.q2, 0.005),
    data: {
      q0: scenario.q0,
      rPercent: scenario.rPercent,
      q1: scenario.q1,
      secondCorrection,
      q2: scenario.q2,
    },
    primaryStructure: "division_scale_second_correction",
    secondarySkillIds: ["B-RMUL-02"],
    inputKind: "number",
    targetPrecision: "1%",
    generatorParams: {
      q0: scenario.q0,
      rPercent: scenario.rPercent,
      q1: scenario.q1,
      secondCorrection,
      q2: scenario.q2,
    },
  });
}

function obviousMultipleCorrectionQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const denominator = randomInteger(context, 100, 499);
  const magnitude = choose(
    context,
    difficultyBand === "L1" ? ([1, 10] as const) : ([1, 10, 100] as const),
  );
  const q0 = randomInteger(context, 2, 9) * magnitude;
  const baseNumerator = denominator * q0;
  const deltaRatio = choose(
    context,
    difficultyBand === "L1"
      ? ([-0.01, 0.01] as const)
      : difficultyBand === "L2"
        ? ([-0.018, -0.008, 0.012, 0.02] as const)
        : ([-0.028, -0.014, 0.017, 0.03] as const),
  );
  const numerator = Math.round(baseNumerator * (1 + deltaRatio));
  const actualDelta = (numerator - baseNumerator) / baseNumerator;
  const result = q0 * (1 + actualDelta);
  return question({
    context,
    skillId: "C-DIVSCALE-15",
    difficultyBand,
    prompt: `${numerator}÷${denominator}，已知附近明显倍数 A0=${baseNumerator}，Q0=${q0}。用 δ=(A-A0)/A0 做线性修正，最终商≈`,
    answer: cleanNumber(result, 5),
    acceptedRange: relativeRange(result, difficultyBand === "L3" ? 0.01 : 0.005),
    data: {
      numerator,
      denominator,
      baseNumerator,
      q0,
      deltaRatio: actualDelta,
      result,
    },
    primaryStructure: "division_scale_obvious_multiple_linear_correction",
    secondarySkillIds: ["A-MAG-02", "B-R-03", "B-RMUL-05"],
    inputKind: "number",
    targetPrecision: difficultyBand === "L3" ? "1%" : "exact",
    generatorParams: {
      numerator,
      denominator,
      baseNumerator,
      q0,
      deltaRatio: actualDelta,
      result,
    },
  });
}

function flowChoice(
  id: string,
  stepSkillId: SkillId,
  prompt: string,
  expectedValue: string,
  choices: QuestionStepChoice[],
): QuestionStepSpec {
  return {
    id,
    stepSkillId,
    stepType: "decision",
    prompt,
    inputKind: "choice",
    expectedValue,
    allowedAnswerSet: [expectedValue],
    choices,
  };
}

function flowNumber(
  id: string,
  stepSkillId: SkillId,
  prompt: string,
  expectedValue: number,
  targetPrecision: TargetPrecision = "exact",
  tolerance = 0,
): QuestionStepSpec {
  return {
    id,
    stepSkillId,
    stepType: "calculation",
    prompt,
    inputKind: "number",
    expectedValue: cleanNumber(expectedValue, 5),
    targetPrecision,
    acceptedRange:
      tolerance > 0 ? acceptedAround(expectedValue, tolerance) : undefined,
  };
}

function fullCompensationFlowQuestion(context: GenerationContext) {
  const useNumerator = context.random() < 0.5;
  const scenario = resultScaleScenario("L3", context);
  const baseChoices = shuffle(
    context,
    Array.from(new Set([scenario.base, 100, 125, 200, 400, 500]))
      .slice(0, 5)
      .map((value) => ({ value: String(value), label: String(value) })),
  );
  const commonSteps: QuestionStepSpec[] = [
    flowChoice(
      "scale-base",
      "C-DIVSCALE-02",
      "选择附近明显更好算的分母基准：",
      String(scenario.base),
      baseChoices,
    ),
    flowChoice(
      "scale-worth",
      "C-DIVSCALE-03",
      `基准偏差约 ${cleanNumber(scenario.rPercent, 2)}%，且新基准明显更好算，是否值得继续？`,
      scenario.rPercent <= 10 ? "worth" : "exit",
      [
        { value: "worth", label: "值得继续" },
        { value: "exit", label: "退出放缩" },
      ],
    ),
    flowChoice(
      "scale-route",
      "C-DIVSCALE-04",
      "这题把补偿放在哪里更省？",
      useNumerator ? "numerator" : "result",
      [
        { value: "numerator", label: "分子端" },
        { value: "result", label: "结果端" },
      ],
    ),
  ];

  let finalResult: number;
  let branchSteps: QuestionStepSpec[];
  if (useNumerator) {
    const idealNumerator = (scenario.numerator * scenario.base) / scenario.denominator;
    const roundedNumerator = Math.round(idealNumerator / 10) * 10;
    const direction = scenario.base > scenario.denominator ? "increase" : "decrease";
    const adjustment = roundedNumerator - scenario.numerator;
    finalResult = roundedNumerator / scenario.base;
    branchSteps = [
      flowChoice(
        "scale-numerator-direction",
        "C-DIVSCALE-05",
        "若走分子端，分子应增还是减？",
        direction,
        [
          { value: "increase", label: "增加" },
          { value: "decrease", label: "减少" },
        ],
      ),
      flowNumber(
        "scale-numerator-adjustment",
        "C-DIVSCALE-06",
        "估计分子调整量（带正负号）：",
        adjustment,
        "range",
        Math.max(1, Math.abs(adjustment) * 0.08),
      ),
      flowChoice(
        "scale-nice-numerator",
        "C-DIVSCALE-07",
        "选择附近更好算的新分子：",
        String(roundedNumerator),
        shuffle(
          context,
          [roundedNumerator, roundedNumerator - 10, roundedNumerator + 10].map(
            (value) => ({ value: String(value), label: String(value) }),
          ),
        ),
      ),
      flowNumber(
        "scale-adjusted-division",
        "C-DIVSCALE-08",
        "完成新分子÷基准分母：",
        finalResult,
        "1%",
        Math.max(0.01, Math.abs(finalResult) * 0.01),
      ),
    ];
  } else {
    finalResult = scenario.q1;
    const needSecond = scenario.r * scenario.r > 0.005;
    branchSteps = [
      flowNumber(
        "scale-result-r",
        "C-DIVSCALE-09",
        "按 r=|D-B|/B 求 r（填百分数数字）：",
        scenario.rPercent,
        "range",
        0.1,
      ),
      flowNumber(
        "scale-result-q0",
        "C-DIVSCALE-10",
        "求 Q0=A/B：",
        scenario.q0,
      ),
      flowNumber(
        "scale-result-correction",
        "C-DIVSCALE-11",
        "求带符号的一阶修正量：",
        scenario.correction,
        "range",
        Math.max(0.01, Math.abs(scenario.correction) * 0.02),
      ),
      flowNumber(
        "scale-result-q1",
        "C-DIVSCALE-12",
        "得到一阶结果 Q1：",
        scenario.q1,
        "1%",
        Math.max(0.01, Math.abs(scenario.q1) * 0.01),
      ),
      flowChoice(
        "scale-second-decision",
        "C-DIVSCALE-13",
        "当前一阶残差量级约为 r²，是否需要二阶？",
        needSecond ? "yes" : "no",
        [
          { value: "no", label: "一阶够用，停止" },
          { value: "yes", label: "继续二阶" },
        ],
      ),
    ];
    if (needSecond) {
      finalResult = scenario.q2;
      branchSteps.push(
        flowNumber(
          "scale-result-q2",
          "C-DIVSCALE-14",
          "加上 Q0×r²，得到二阶结果 Q2：",
          scenario.q2,
          "1%",
          Math.max(0.01, Math.abs(scenario.q2) * 0.005),
        ),
      );
    }
  }

  const steps = [...commonSteps, ...branchSteps];
  return question({
    context,
    skillId: "C-DIVSCALE-04",
    difficultyBand: "L3",
    prompt: `完整除法补偿放缩：${cleanNumber(scenario.numerator, 2)}÷${scenario.denominator}`,
    answer: cleanNumber(finalResult, 5),
    data: {
      numerator: scenario.numerator,
      denominator: scenario.denominator,
      base: scenario.base,
      route: useNumerator ? "numerator" : "result",
      finalResult,
    },
    primaryStructure: useNumerator
      ? "division_scale_full_numerator_flow"
      : "division_scale_full_result_flow",
    secondarySkillIds: [
      "B-BASE-02",
      "B-R-03",
      "B-RMUL-05",
      "C-EST-10",
    ],
    inputKind: "steps",
    stepSpecs: steps,
    targetPrecision: "1%",
    generatorParams: {
      numerator: scenario.numerator,
      denominator: scenario.denominator,
      base: scenario.base,
      route: useNumerator ? "numerator" : "result",
      rPercent: scenario.rPercent,
      finalResult,
    },
  });
}

export function generateBatch6DivisionScaleQuestion(
  skillId: Batch6DivisionScaleSkillId,
  difficultyBand: DifficultyBand,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (skillId === "C-DIVSCALE-01")
    return obviousMultipleQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-02")
    return baseChoiceQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-03")
    return worthQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-04")
    return routeChoiceQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-05")
    return numeratorDirectionQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-06")
    return numeratorAdjustmentQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-07")
    return niceNumeratorQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-08")
    return adjustedDivisionQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-09")
    return resultRQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-10") return q0Question(difficultyBand, context);
  if (skillId === "C-DIVSCALE-11")
    return firstCorrectionQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-12")
    return firstResultQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-13")
    return secondOrderDecisionQuestion(difficultyBand, context);
  if (skillId === "C-DIVSCALE-14")
    return secondCorrectionQuestion(difficultyBand, context);
  return obviousMultipleCorrectionQuestion(difficultyBand, context);
}

export function generateBatch6DivisionScaleSet(
  skillId: Batch6DivisionScaleSkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    generateBatch6DivisionScaleQuestion(skillId, difficultyBand, context),
  );
}

export function gradeBatch6DivisionScaleQuestion(
  questionToGrade: GeneratedQuestion,
  input: string,
) {
  if (
    questionToGrade.type !== "skill_drill" ||
    !isBatch6DivisionScaleSkillId(questionToGrade.skillId)
  )
    throw new Error(
      "Only implemented batch-6 division scaling drills can use this grader.",
    );

  const normalizedInput = input.trim();
  const allowed = questionToGrade.allowedAnswerSet?.map(String) ?? [];
  if (allowed.includes(normalizedInput))
    return { isCorrect: true, accuracyLevel: "exact" as const };

  if (questionToGrade.inputKind === "choice") {
    const isCorrect = normalizedInput === questionToGrade.answer;
    return {
      isCorrect,
      accuracyLevel: isCorrect ? ("exact" as const) : ("wrong" as const),
    };
  }

  const actual = Number(normalizedInput.replace("%", ""));
  const expected = Number(questionToGrade.answer.replace("%", ""));
  if (!Number.isFinite(actual) || !Number.isFinite(expected))
    return { isCorrect: false, accuracyLevel: "wrong" as const };
  const epsilon = Number.EPSILON * Math.max(1, Math.abs(expected));
  if (Math.abs(actual - expected) <= epsilon)
    return { isCorrect: true, accuracyLevel: "exact" as const };
  const range = questionToGrade.acceptedRange;
  const accepted =
    range !== undefined && actual >= range.min && actual <= range.max;
  return {
    isCorrect: accepted,
    accuracyLevel: accepted ? ("accepted" as const) : ("wrong" as const),
  };
}
