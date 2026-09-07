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

export const BATCH7_SKILL_GENERATOR_VERSION = "stage4-batch7-1.0.0";

export const batch7SkillIds = [
  "B-ORDER-01",
  "B-ORDER-02",
  "B-ORDER-03",
  "B-ORDER-04",
  "B-ORDER-05",
  "B-ORDER-06",
  "B-ORDER-07",
  "B-ORDER-08",
  "B-SPLIT-01",
  "B-SPLIT-02",
  "B-MSPLIT-01",
  "B-MSPLIT-02",
  "B-CONV-01",
  "B-CONV-02",
  "C-ADD-01",
  "C-ADD-02",
  "C-ADD-03",
  "C-EST-01",
  "C-EST-02",
  "C-EST-03",
  "C-EST-04",
  "C-EST-05",
  "C-EST-06",
  "C-EST-07",
  "C-EST-08",
  "C-EST-09",
  "C-EST-10",
  "C-EST-11",
  "C-XP-SCALE-01",
  "C-XP-SCALE-02",
  "C-XP-SCALE-03",
  "C-CMP-01",
  "C-CMP-02",
  "C-CMP-03",
  "C-CMP-04",
  "C-CMP-05",
  "C-CMP-06",
] as const satisfies readonly SkillId[];

export type Batch7SkillId = (typeof batch7SkillIds)[number];

const batch7SkillSet = new Set<string>(batch7SkillIds);

export function isBatch7SkillId(value: unknown): value is Batch7SkillId {
  return typeof value === "string" && batch7SkillSet.has(value);
}

type ChoiceOption = QuestionStepChoice;

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
  skillId: Batch7SkillId;
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
      tags: ["纯计算能力专项", ...structureTags],
    },
    primaryStructure: input.primaryStructure,
    secondaryTags: input.secondaryTags ?? [],
    generationRuleVersion: BATCH7_SKILL_GENERATOR_VERSION,
    skillId: input.skillId,
    secondarySkillIds: input.secondarySkillIds ?? [],
    difficultyBand: input.difficultyBand,
    structureTags,
    targetPrecision: input.targetPrecision ?? "exact",
    generatorParams: {
      generatorFamily: "remaining_b_c_pure_computation",
      implementationBatch: "stage4_batch7",
      ...(input.generatorParams ?? {}),
    },
    allowedAnswerSet: input.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind,
    stepSpecs: input.stepSpecs,
  };
}

function indexedTerms(values: readonly number[]) {
  return values.map((value, index) => `${index + 1}:${value}`).join("，");
}

function sequenceOptions(
  context: GenerationContext,
  values: readonly { value: string; label: string }[],
) {
  return shuffle(context, values);
}

function orderQuestion(
  skillId: Extract<Batch7SkillId, `B-ORDER-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  if (skillId === "B-ORDER-01") {
    const byBand = {
      L1: {
        terms: [48, 52, 37],
        answer: "1,2,3",
        allowed: ["1,2,3", "2,1,3"],
        options: [
          { value: "1,2,3", label: "先48+52，再加37" },
          { value: "1,3,2", label: "先48+37，再加52" },
          { value: "3,2,1", label: "先37+52，再加48" },
        ],
      },
      L2: {
        terms: [148, 252, 87, 13],
        answer: "1,2,3,4",
        allowed: ["1,2,3,4", "3,4,1,2"],
        options: [
          { value: "1,2,3,4", label: "148+252 → 87+13" },
          { value: "3,4,1,2", label: "87+13 → 148+252" },
          { value: "1,3,2,4", label: "148+87 → 252+13" },
        ],
      },
      L3: {
        terms: [398, 602, 149, 51, 27],
        answer: "1,2,3,4,5",
        allowed: ["1,2,3,4,5", "3,4,1,2,5"],
        options: [
          { value: "1,2,3,4,5", label: "398+602 → 149+51 → +27" },
          { value: "3,4,1,2,5", label: "149+51 → 398+602 → +27" },
          { value: "1,3,2,4,5", label: "398+149 → 602+51 → +27" },
        ],
      },
    } as const;
    const template = byBand[difficultyBand];
    const options = sequenceOptions(context, template.options);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `给加数 ${indexedTerms(template.terms)}，选择更省操作的相加顺序：`,
      answer: template.answer,
      data: choiceData({ terms: [...template.terms] }, options),
      primaryStructure: "addition_round_pair_order",
      secondarySkillIds: ["A-COM-01", "A-COM-02", "B-BASE-01", "B-BASE-02"],
      inputKind: "sequence",
      allowedAnswerSet: [...template.allowed],
      generatorParams: { termCount: template.terms.length },
    });
  }

  if (skillId === "B-ORDER-02") {
    const byBand = {
      L1: {
        start: 1000,
        subtrahends: [487, 13],
        answer: "2,1",
        options: [
          { value: "2,1", label: "先减13，再减487" },
          { value: "1,2", label: "先减487，再减13" },
        ],
      },
      L2: {
        start: 2500,
        subtrahends: [1268, 232],
        answer: "2,1",
        options: [
          { value: "2,1", label: "先减232，再减1268" },
          { value: "1,2", label: "先减1268，再减232" },
        ],
      },
      L3: {
        start: 5000,
        subtrahends: [1987, 13, 1000],
        answer: "2,1,3",
        options: [
          { value: "2,1,3", label: "13 → 1987 → 1000" },
          { value: "1,2,3", label: "1987 → 13 → 1000" },
          { value: "3,1,2", label: "1000 → 1987 → 13" },
        ],
      },
    } as const;
    const template = byBand[difficultyBand];
    const options = sequenceOptions(context, template.options);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${template.start} 连续减去 ${indexedTerms(template.subtrahends)}，选择更省借位的减数顺序：`,
      answer: template.answer,
      data: choiceData(
        { start: template.start, subtrahends: [...template.subtrahends] },
        options,
      ),
      primaryStructure: "subtraction_reorder_to_round",
      secondarySkillIds: ["A-SUB-01", "A-SUB-02", "A-COM-02"],
      inputKind: "sequence",
      allowedAnswerSet: [template.answer],
      generatorParams: { subtrahendCount: template.subtrahends.length },
    });
  }

  if (skillId === "B-ORDER-03") {
    const byBand = {
      L1: {
        factors: [8, 125, 7],
        answer: "1,2,3",
        options: [
          { value: "1,2,3", label: "先8×125，再×7" },
          { value: "1,3,2", label: "先8×7，再×125" },
          { value: "2,3,1", label: "先125×7，再×8" },
        ],
      },
      L2: {
        factors: [4, 25, 16, 3],
        answer: "1,2,3,4",
        options: [
          { value: "1,2,3,4", label: "先4×25，再16×3" },
          { value: "2,3,1,4", label: "先25×16，再×4×3" },
          { value: "1,3,2,4", label: "先4×16，再×25×3" },
        ],
      },
      L3: {
        factors: [8, 125, 5, 14],
        answer: "1,2,3,4",
        options: [
          { value: "1,2,3,4", label: "先8×125，再5×14" },
          { value: "1,3,2,4", label: "先8×5，再125×14" },
          { value: "2,4,1,3", label: "先125×14，再8×5" },
        ],
      },
    } as const;
    const template = byBand[difficultyBand];
    const options = sequenceOptions(context, template.options);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `因子 ${indexedTerms(template.factors)}，选择能优先形成整百/整千的乘法顺序：`,
      answer: template.answer,
      data: choiceData({ factors: [...template.factors] }, options),
      primaryStructure: "multiplication_anchor_reorder",
      secondarySkillIds: ["A-SPM-02", "A-SPM-03"],
      inputKind: "sequence",
      allowedAnswerSet: [template.answer],
      generatorParams: { factorCount: template.factors.length },
    });
  }

  if (skillId === "B-ORDER-04") {
    const byBand = {
      L1: {
        dividend: 960,
        divisors: [32, 3],
        answer: "1,2",
        options: [
          { value: "1,2", label: "先÷32，再÷3" },
          { value: "2,1", label: "先÷3，再÷32" },
        ],
      },
      L2: {
        dividend: 8640,
        divisors: [27, 16],
        answer: "1,2",
        options: [
          { value: "1,2", label: "先÷27得320，再÷16" },
          { value: "2,1", label: "先÷16得540，再÷27" },
        ],
      },
      L3: {
        dividend: 7425,
        divisors: [25, 11],
        answer: "1,2",
        options: [
          { value: "1,2", label: "先÷25得297，再÷11" },
          { value: "2,1", label: "先÷11得675，再÷25" },
        ],
      },
    } as const;
    const template = byBand[difficultyBand];
    const options = sequenceOptions(context, template.options);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${template.dividend} 连续除以 ${template.divisors.join("、")}，选择当前约定的低成本顺序：`,
      answer: template.answer,
      data: choiceData(
        { dividend: template.dividend, divisors: [...template.divisors] },
        options,
      ),
      primaryStructure: "continuous_division_reorder",
      secondarySkillIds: ["A-MAG-01", "A-SPM-02"],
      inputKind: "sequence",
      allowedAnswerSet: [template.answer],
      generatorParams: { dividend: template.dividend },
    });
  }

  if (skillId === "B-ORDER-05") {
    const byBand = {
      L1: {
        expression: "375×8÷25",
        answer: "divide,multiply",
        options: [
          { value: "divide,multiply", label: "先375÷25，再×8" },
          { value: "multiply,divide", label: "先375×8，再÷25" },
        ],
      },
      L2: {
        expression: "625×24÷125",
        answer: "divide,multiply",
        options: [
          { value: "divide,multiply", label: "先625÷125，再×24" },
          { value: "multiply,divide", label: "先625×24，再÷125" },
        ],
      },
      L3: {
        expression: "875×16÷25",
        answer: "divide,multiply",
        options: [
          { value: "divide,multiply", label: "先875÷25，再×16" },
          { value: "multiply,divide", label: "先875×16，再÷25" },
          { value: "split,multiply", label: "先拆16，再从左到右" },
        ],
      },
    } as const;
    const template = byBand[difficultyBand];
    const options = sequenceOptions(context, template.options);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${template.expression}，在等值前提下选择更省操作的乘除重组：`,
      answer: template.answer,
      data: choiceData({ expression: template.expression }, options),
      primaryStructure: "multiply_divide_reorder",
      secondarySkillIds: ["A-SPM-02", "A-SPM-03", "A-MAG-01"],
      inputKind: "sequence",
      allowedAnswerSet: [template.answer],
      generatorParams: { expression: template.expression },
    });
  }

  if (skillId === "B-ORDER-06") {
    const byBand = {
      L1: {
        expression: "48+52+37",
        answer: "round_pair_first",
        options: [
          { value: "round_pair_first", label: "48+52 → +37（2步且先凑整）" },
          { value: "left_to_right", label: "48+37 → +52" },
          { value: "small_first", label: "37+48 → +52" },
        ],
      },
      L2: {
        expression: "375×8÷25",
        answer: "divide_first",
        options: [
          { value: "divide_first", label: "375÷25 → ×8" },
          { value: "multiply_first", label: "375×8 → ÷25" },
          { value: "split_first", label: "先拆375再逐步算" },
        ],
      },
      L3: {
        expression: "996+487-96",
        answer: "compensate_first",
        options: [
          { value: "compensate_first", label: "996-96 → +487" },
          { value: "left_to_right", label: "996+487 → -96" },
          { value: "approx_first", label: "先把996近似成1000再直接算" },
        ],
      },
    } as const;
    const template = byBand[difficultyBand];
    const options = sequenceOptions(context, template.options);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `比较 ${template.expression} 的候选路径，选择操作成本最低的一条：`,
      answer: template.answer,
      data: choiceData({ expression: template.expression }, options),
      primaryStructure: "minimum_operation_cost_order",
      secondarySkillIds: ["B-BASE-01", "B-BASE-02", "B-APP-05"],
      inputKind: "sequence",
      allowedAnswerSet: [template.answer],
      generatorParams: { expression: template.expression },
    });
  }

  if (skillId === "B-ORDER-07") {
    const smallPercent =
      difficultyBand === "L1"
        ? 4
        : difficultyBand === "L2"
          ? 7
          : choose(context, [8, 9, 10] as const);
    const options = [
      { value: "major", label: "先算大影响步骤" },
      { value: "minor", label: `先算约${smallPercent}%的小影响步骤` },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `当前有一个会显著改变结果的主步骤，以及一个约 ${smallPercent}% 的小修正。为了尽快稳定主结果，应先算谁？`,
      answer: "major",
      data: choiceData({ smallPercent }, shuffle(context, options)),
      primaryStructure: "large_impact_first",
      secondarySkillIds: ["C-EST-10"],
      inputKind: "choice",
      allowedAnswerSet: ["major"],
      generatorParams: { smallPercent },
    });
  }

  const currentError =
    difficultyBand === "L1"
      ? choose(context, [1, 2] as const)
      : difficultyBand === "L2"
        ? choose(context, [2, 3, 4] as const)
        : choose(context, [2.5, 3.5, 4.5] as const);
  const target = difficultyBand === "L1" ? 5 : difficultyBand === "L2" ? 3 : 3;
  const minorEffect =
    difficultyBand === "L3"
      ? choose(context, [1, 2, 4] as const)
      : choose(context, [1, 2] as const);
  const canDelay = currentError <= target && currentError + minorEffect <= target;
  const answer = canDelay ? "delay" : "restore";
  const options = [
    { value: "delay", label: "暂缓小影响项，先结束当前主计算" },
    { value: "restore", label: "现在补回小影响项" },
  ];
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `当前粗结果误差约 ${cleanNumber(currentError, 1)}%，目标≤${target}%，尚有约 ${minorEffect}% 的小影响项未补。现在应暂缓还是补回？`,
    answer,
    data: choiceData(
      { currentError, targetPercent: target, minorEffect },
      shuffle(context, options),
    ),
    primaryStructure: canDelay ? "defer_small_impact" : "restore_small_impact",
    secondarySkillIds: ["C-EST-10", "C-EST-11"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { currentError, target, minorEffect, canDelay },
  });
}

function splitQuestion(
  skillId: Extract<Batch7SkillId, "B-SPLIT-01" | "B-SPLIT-02">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  const byBand = {
    L1: { value: 398, best: "400-2", alternatives: ["400-2", "390+8", "300+98"] },
    L2: { value: 1003, best: "1000+3", alternatives: ["1000+3", "900+103", "1010-7"] },
    L3: { value: 2497, best: "2500-3", alternatives: ["2500-3", "2400+97", "2490+7", "3000-503"] },
  } as const;
  const template = byBand[difficultyBand];
  const options = shuffle(
    context,
    template.alternatives.map((value) => ({ value, label: value })),
  );
  return question({
    context,
    skillId,
    difficultyBand,
    prompt:
      skillId === "B-SPLIT-01"
        ? `为了后续凑整计算，把 ${template.value} 等值拆成更低成本的形式：`
        : `${template.value} 有多种等值拆法，选择计算成本最低的一种：`,
    answer: template.best,
    data: choiceData({ sourceValue: template.value }, options),
    primaryStructure:
      skillId === "B-SPLIT-01" ? "equivalent_round_split" : "minimum_cost_number_split",
    secondarySkillIds: ["A-COM-02", "B-BASE-02"],
    inputKind: "choice",
    allowedAnswerSet: [template.best],
    generatorParams: { sourceValue: template.value, bestSplit: template.best },
  });
}

function multiplicationSplitQuestion(
  skillId: Extract<Batch7SkillId, "B-MSPLIT-01" | "B-MSPLIT-02">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  if (skillId === "B-MSPLIT-01") {
    const byBand = {
      L1: { a: 47, b: 198, best: "47×(200-2)" },
      L2: { a: 63, b: 49, best: "63×(50-1)" },
      L3: { a: 84, b: 103, best: "84×(100+3)" },
    } as const;
    const template = byBand[difficultyBand];
    const distractors = [
      `${template.a}×(${template.b - 10}+10)`,
      `${template.a}×(${template.b - 1}+1)`,
      `${template.a}×${template.b}`,
    ];
    const options = shuffle(
      context,
      [template.best, ...distractors.filter((value) => value !== template.best)]
        .slice(0, 4)
        .map((value) => ({ value, label: value })),
    );
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${template.a}×${template.b}，选择最适合利用邻近整基准的等值拆式：`,
      answer: template.best,
      data: choiceData({ a: template.a, b: template.b }, options),
      primaryStructure: "near_round_multiplication_split",
      secondarySkillIds: ["A-COM-01", "A-COM-02", "A-MUL-04"],
      inputKind: "choice",
      allowedAnswerSet: [template.best],
      generatorParams: { a: template.a, b: template.b, bestSplit: template.best },
    });
  }

  const byBand = {
    L1: { a: 63, b: 24, best: "63×(20+4)" },
    L2: { a: 78, b: 47, best: "78×(50-3)" },
    L3: { a: 126, b: 53, best: "126×(50+3)" },
  } as const;
  const template = byBand[difficultyBand];
  const options = shuffle(context, [
    { value: template.best, label: template.best },
    { value: `${template.a}×(${template.b - 10}+10)`, label: `${template.a}×(${template.b - 10}+10)` },
    { value: `${template.a}×(${Math.floor(template.b / 2)}+${template.b - Math.floor(template.b / 2)})`, label: "近似对半拆" },
  ]);
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${template.a}×${template.b}，选择更低成本的乘数拆分：`,
    answer: template.best,
    data: choiceData({ a: template.a, b: template.b }, options),
    primaryStructure: "multiplier_low_cost_split",
    secondarySkillIds: ["A-MUL-04", "B-BASE-01"],
    inputKind: "choice",
    allowedAnswerSet: [template.best],
    generatorParams: { a: template.a, b: template.b, bestSplit: template.best },
  });
}

function conversionQuestion(
  skillId: Extract<Batch7SkillId, "B-CONV-01" | "B-CONV-02">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  if (skillId === "B-CONV-01") {
    const anchors = [
      { denominator: 125, factor: 0.008, label: "×0.008" },
      { denominator: 143, factor: 0.007, label: "约×0.007" },
      { denominator: 167, factor: 0.006, label: "约×0.006" },
      { denominator: 111, factor: 0.009, label: "约×0.009" },
      { denominator: 333, factor: 0.003, label: "约×0.003" },
    ] as const;
    const anchor = choose(
      context,
      difficultyBand === "L1" ? anchors.slice(0, 2) : anchors,
    );
    const scale = difficultyBand === "L3" ? choose(context, [1, 10] as const) : 1;
    const denominator = anchor.denominator * scale;
    const answerFactor = anchor.factor / scale;
    const answer = `×${cleanNumber(answerFactor, 6)}`;
    const distractors = [answerFactor * 10, answerFactor / 10, answerFactor * 1.5];
    const options = shuffle(
      context,
      [answerFactor, ...distractors].map((factor) => ({
        value: `×${cleanNumber(factor, 6)}`,
        label: `×${cleanNumber(factor, 6)}`,
      })),
    );
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `把“某数 ÷ ${denominator}”改写成最接近的倒数锚点乘法：`,
      answer,
      data: choiceData({ denominator, anchorDenominator: anchor.denominator }, options),
      primaryStructure: "reciprocal_anchor_conversion",
      secondarySkillIds: ["B-BASE-05", "A-FRA-01", "A-PLACE-06"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { denominator, factor: answerFactor },
    });
  }

  const factor =
    difficultyBand === "L1"
      ? choose(context, [2, 5, 10] as const)
      : difficultyBand === "L2"
        ? choose(context, [4, 5, 10, 25] as const)
        : choose(context, [2, 4, 5, 10, 25] as const);
  const baseNumerator = randomInteger(context, 12, 80);
  const baseDenominator = randomInteger(context, 11, 60);
  const numerator = baseNumerator * factor;
  const denominator = baseDenominator * factor;
  const answer = `${baseNumerator}/${baseDenominator}`;
  const options = shuffle(context, [
    { value: answer, label: `${baseNumerator}/${baseDenominator}` },
    { value: `${baseNumerator + 1}/${baseDenominator}`, label: `${baseNumerator + 1}/${baseDenominator}` },
    { value: `${baseNumerator}/${baseDenominator + 1}`, label: `${baseNumerator}/${baseDenominator + 1}` },
    { value: `${baseNumerator * 2}/${baseDenominator}`, label: `${baseNumerator * 2}/${baseDenominator}` },
  ]);
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${numerator}/${denominator} 同比例约分后，下面哪个式子与原式严格等值？`,
    answer,
    data: choiceData({ numerator, denominator, factor }, options),
    primaryStructure: "exact_equal_ratio_transform",
    secondarySkillIds: ["A-SPM-01", "A-SPM-02", "A-PLACE-02"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { numerator, denominator, factor, reducedNumerator: baseNumerator, reducedDenominator: baseDenominator },
  });
}

function addExpressionQuestion(
  skillId: Extract<Batch7SkillId, `C-ADD-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  if (skillId === "C-ADD-01") {
    const count = difficultyBand === "L1" ? 3 : difficultyBand === "L2" ? 4 : 6;
    const first = randomInteger(context, difficultyBand === "L3" ? 2000 : 600, difficultyBand === "L3" ? 9000 : 1800);
    const terms = [first];
    const signs = [1];
    let result = first;
    for (let index = 1; index < count; index += 1) {
      const term = randomInteger(context, 40, difficultyBand === "L3" ? 1800 : 700);
      const sign = index % 3 === 2 ? -1 : 1;
      terms.push(term);
      signs.push(sign);
      result += sign * term;
    }
    if (result <= 0) {
      result += Math.abs(result) + 1000;
      terms[0] += Math.abs(result) + 1000;
    }
    const expression = terms
      .map((term, index) => (index === 0 ? String(term) : `${signs[index] > 0 ? "+" : "-"}${term}`))
      .join("");
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${expression} =`,
      answer: String(result),
      data: { terms, signs },
      primaryStructure: "multi_step_add_subtract",
      secondarySkillIds: ["A-ADD-01", "A-SUB-01", "B-ORDER-01", "B-ORDER-02"],
      inputKind: "number",
      generatorParams: { termCount: count },
    });
  }

  if (skillId === "C-ADD-02") {
    const count = difficultyBand === "L1" ? 3 : difficultyBand === "L2" ? 4 : 6;
    const terms = Array.from({ length: count }, () =>
      randomInteger(context, difficultyBand === "L3" ? 1000 : 200, difficultyBand === "L3" ? 9999 : 4999),
    );
    const total = terms.reduce((sum, value) => sum + value, 0);
    const place = difficultyBand === "L1" ? 100 : difficultyBand === "L2" ? 100 : 1000;
    const truncated = Math.floor(total / place) * place;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${terms.join("+")}，只累计到${place === 1000 ? "千位" : "百位"}，忽略更低位，结果填：`,
      answer: String(truncated),
      data: { terms, total, place },
      primaryStructure: "high_digit_accumulation",
      secondarySkillIds: ["A-ADD-01", "A-PLACE-05", "C-EST-11"],
      targetPrecision: "magnitude",
      inputKind: "number",
      generatorParams: { termCount: count, place },
    });
  }

  const count = difficultyBand === "L1" ? 3 : difficultyBand === "L2" ? 4 : 5;
  const terms = Array.from({ length: count }, () => randomInteger(context, 100, 9999));
  const total = terms.reduce((sum, value) => sum + value, 0);
  const candidates = [total, total + 1, total + 3, total + 7].map((value) => ({
    value: String(value),
    label: String(value),
  }));
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${terms.join("+")} 不做完整计算，只看尾数，哪个候选可能是正确结果？`,
    answer: String(total),
    data: choiceData({ terms, total, unitsDigit: total % 10 }, shuffle(context, candidates)),
    primaryStructure: "tail_digit_elimination",
    secondarySkillIds: ["A-ADD-01"],
    inputKind: "choice",
    allowedAnswerSet: [String(total)],
    generatorParams: { termCount: count, unitsDigit: total % 10 },
  });
}

function errorBand(percent: number) {
  const absolute = Math.abs(percent);
  if (absolute < 1) return "<1%";
  if (absolute < 3) return "1-3%";
  if (absolute < 5) return "3-5%";
  return ">5%";
}

const errorBandOptions = ["<1%", "1-3%", "3-5%", ">5%"] as const;

function estimationQuestion(
  skillId: Extract<Batch7SkillId, `C-EST-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  if (skillId === "C-EST-01") {
    const a = difficultyBand === "L1" ? randomInteger(context, 40, 90) : randomInteger(context, 180, 980);
    const b = difficultyBand === "L3" ? randomInteger(context, 80, 240) : randomInteger(context, 12, 80);
    const product = a * b;
    const exponent = Math.floor(Math.log10(product));
    const answer = `10^${exponent}`;
    const options = shuffle(context, [exponent - 1, exponent, exponent + 1].map((value) => ({
      value: `10^${value}`,
      label: `10^${value} 量级`,
    })));
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `不精算，判断 ${a}×${b} 的主要数量级：`,
      answer,
      data: choiceData({ a, b, product }, options),
      primaryStructure: "estimate_magnitude_interval",
      secondarySkillIds: ["A-PLACE-05", "B-APP-01"],
      targetPrecision: "magnitude",
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { a, b, exponent },
    });
  }

  if (skillId === "C-EST-02") {
    const templates = [
      { prompt: "198+350 近似成 200+350", answer: "high", label: "结果偏大" },
      { prompt: "650-198 近似成 650-200", answer: "low", label: "结果偏小" },
      { prompt: "198×41 近似成 200×41", answer: "high", label: "结果偏大" },
      { prompt: "800÷198 近似成 800÷200", answer: "low", label: "结果偏小" },
      { prompt: "798÷40 近似成 800÷40", answer: "high", label: "结果偏大" },
    ] as const;
    const template = choose(
      context,
      difficultyBand === "L1" ? templates.slice(0, 3) : templates,
    );
    const options = [
      { value: "high", label: "近似结果偏大" },
      { value: "low", label: "近似结果偏小" },
      { value: "same", label: "不变" },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${template.prompt}，近似后的结果相对原式：`,
      answer: template.answer,
      data: choiceData({ scenario: template.prompt }, shuffle(context, options)),
      primaryStructure: "single_approximation_direction",
      secondarySkillIds: ["B-APP-02", "B-APP-03"],
      inputKind: "choice",
      allowedAnswerSet: [template.answer],
      generatorParams: { scenario: template.prompt },
    });
  }

  if (skillId === "C-EST-03") {
    const changes =
      difficultyBand === "L1"
        ? [choose(context, [0.5, 2, 4, 6] as const)]
        : difficultyBand === "L2"
          ? [choose(context, [1, 2, 3] as const), choose(context, [-1, 1, 2] as const)]
          : [choose(context, [2, 3, 4] as const), choose(context, [-2, 1, 3] as const)];
    const factor = changes.reduce((value, percent) => value * (1 + percent / 100), 1);
    const totalPercent = (factor - 1) * 100;
    const answer = errorBand(totalPercent);
    const options = errorBandOptions.map((value) => ({ value, label: value }));
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `近似中相对改动依次为 ${changes.map((value) => `${value > 0 ? "+" : ""}${value}%`).join("、")}，总误差大致落在哪一档？`,
      answer,
      data: choiceData({ changes, totalPercent }, shuffle(context, options)),
      primaryStructure: "estimate_error_band",
      secondarySkillIds: ["B-APP-05", "B-RMUL-05"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { changes, totalPercent },
    });
  }

  if (skillId === "C-EST-04") {
    const sameDirection = context.random() < 0.5;
    const e1 = choose(context, [10, 20, 30] as const);
    const e2 = sameDirection ? choose(context, [5, 15, 25] as const) : -choose(context, [5, 15, 25] as const);
    const answer = sameDirection ? "accumulate" : "offset";
    const options = [
      { value: "accumulate", label: "误差同向累计" },
      { value: "offset", label: "误差部分抵消" },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `加法 A+B 中，A 的近似误差为 +${e1}，B 的近似误差为 ${e2 > 0 ? "+" : ""}${e2}。总误差主要是：`,
      answer,
      data: choiceData({ errorA: e1, errorB: e2 }, shuffle(context, options)),
      primaryStructure: sameDirection ? "addition_error_accumulate" : "addition_error_offset",
      secondarySkillIds: ["A-ADD-01"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { errorA: e1, errorB: e2 },
    });
  }

  if (skillId === "C-EST-05") {
    const accumulate = context.random() < 0.5;
    const errorA = 20;
    const errorB = accumulate ? -10 : 15;
    const answer = accumulate ? "accumulate" : "offset";
    const options = [
      { value: "accumulate", label: "对差值同向放大，误差累计" },
      { value: "offset", label: "对差值有抵消，误差减弱" },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `减法 A-B 中，A 近似高了 ${errorA}，B ${errorB < 0 ? `近似低了 ${Math.abs(errorB)}` : `近似高了 ${errorB}`}。对 A-B 的误差影响主要是：`,
      answer,
      data: choiceData({ errorA, errorB }, shuffle(context, options)),
      primaryStructure: accumulate ? "subtraction_error_accumulate" : "subtraction_error_offset",
      secondarySkillIds: ["A-SUB-01"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { errorA, errorB },
    });
  }

  if (skillId === "C-EST-06") {
    const e1 = choose(context, difficultyBand === "L1" ? [2, 3, 4] as const : [-4, -2, 2, 4] as const);
    const e2 = choose(context, difficultyBand === "L3" ? [-3, -1, 2, 5] as const : [1, 2, 3] as const);
    const relative = (1 + e1 / 100) * (1 + e2 / 100) - 1;
    const direction = relative > 0 ? "high" : "low";
    const band = errorBand(relative * 100);
    const answer = `${direction}:${band}`;
    const options = shuffle(context, [
      { value: answer, label: `${direction === "high" ? "偏大" : "偏小"}，约${band}` },
      { value: `high:${band}`, label: `偏大，约${band}` },
      { value: `low:${band}`, label: `偏小，约${band}` },
      { value: `${direction}:>5%`, label: `${direction === "high" ? "偏大" : "偏小"}，>5%` },
    ].filter((item, index, values) => values.findIndex((candidate) => candidate.value === item.value) === index));
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `乘法两个因子分别近似变化 ${e1 > 0 ? "+" : ""}${e1}%、${e2 > 0 ? "+" : ""}${e2}%，结果的方向和误差档最接近：`,
      answer,
      data: choiceData({ changes: [e1, e2], relativePercent: relative * 100 }, options),
      primaryStructure: "multiplication_error_propagation",
      secondarySkillIds: ["B-RMUL-02"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { e1, e2, relativePercent: relative * 100 },
    });
  }

  if (skillId === "C-EST-07") {
    const numeratorChange = choose(context, difficultyBand === "L1" ? [2, 4] as const : [-3, 2, 5] as const);
    const denominatorChange = choose(context, difficultyBand === "L3" ? [-3, 2, 5] as const : [1, 3] as const);
    const relative = (1 + numeratorChange / 100) / (1 + denominatorChange / 100) - 1;
    const direction = relative > 0 ? "high" : "low";
    const band = errorBand(relative * 100);
    const answer = `${direction}:${band}`;
    const options = shuffle(context, [
      { value: answer, label: `${direction === "high" ? "偏大" : "偏小"}，约${band}` },
      { value: `high:${band}`, label: `偏大，约${band}` },
      { value: `low:${band}`, label: `偏小，约${band}` },
      { value: `${direction}:>5%`, label: `${direction === "high" ? "偏大" : "偏小"}，>5%` },
    ].filter((item, index, values) => values.findIndex((candidate) => candidate.value === item.value) === index));
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `除法 A/B 中，分子近似变化 ${numeratorChange > 0 ? "+" : ""}${numeratorChange}%，分母近似变化 ${denominatorChange > 0 ? "+" : ""}${denominatorChange}%，结果最接近：`,
      answer,
      data: choiceData({ changes: [numeratorChange, denominatorChange], relativePercent: relative * 100 }, options),
      primaryStructure: "division_error_propagation",
      secondarySkillIds: ["B-R-03", "B-R-05"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { numeratorChange, denominatorChange, relativePercent: relative * 100 },
    });
  }

  if (skillId === "C-EST-08") {
    const patterns = [
      { errors: [2, 1, 1], answer: "high" },
      { errors: [-2, -1, -1], answer: "low" },
      { errors: [3, -2, -1], answer: "offset" },
    ] as const;
    const pattern = choose(context, patterns);
    const options = [
      { value: "high", label: "总体偏大" },
      { value: "low", label: "总体偏小" },
      { value: "offset", label: "大体抵消" },
      { value: "uncertain", label: "方向无法判断" },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `连续近似误差约为 ${pattern.errors.map((value) => `${value > 0 ? "+" : ""}${value}%`).join("、")}，合并后总体更接近：`,
      answer: pattern.answer,
      data: choiceData({ changes: [...pattern.errors] }, shuffle(context, options)),
      primaryStructure: "multi_error_composition",
      secondarySkillIds: ["C-EST-04", "C-EST-05", "C-EST-06", "C-EST-07"],
      inputKind: "choice",
      allowedAnswerSet: [pattern.answer],
      generatorParams: { errors: [...pattern.errors] },
    });
  }

  if (skillId === "C-EST-09") {
    const ledger = choose(context, ["high", "low", "balanced"] as const);
    const answer = ledger === "high" ? "smaller" : ledger === "low" ? "larger" : "none";
    const options = [
      { value: "larger", label: "下一步应补大" },
      { value: "smaller", label: "下一步应补小" },
      { value: "none", label: "无需方向性补偿" },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `当前误差账本显示粗结果${ledger === "high" ? "总体偏大" : ledger === "low" ? "总体偏小" : "正负基本平衡"}。下一步若有可控修正，应：`,
      answer,
      data: choiceData({ ledger }, shuffle(context, options)),
      primaryStructure: "error_ledger_next_compensation",
      secondarySkillIds: ["C-EST-08"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { ledger },
    });
  }

  if (skillId === "C-EST-10") {
    const center = difficultyBand === "L3" ? 100 : 80;
    const errorUpper = difficultyBand === "L1" ? 1 : difficultyBand === "L2" ? 2 : 3;
    const thresholdDistance = context.random() < 0.5 ? errorUpper * 0.6 : errorUpper * 2;
    const threshold = center + thresholdDistance;
    const affects = threshold >= center - errorUpper && threshold <= center + errorUpper;
    const answer = affects ? "yes" : "no";
    const options = [
      { value: "yes", label: "会，误差区间可能跨过阈值" },
      { value: "no", label: "不会，误差区间仍在阈值同一侧" },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `粗结果约 ${center}，误差上界 ±${errorUpper}。若结论取决于是否大于 ${cleanNumber(threshold, 1)}，现有误差会不会改变结论？`,
      answer,
      data: choiceData({ center, errorUpper, threshold }, shuffle(context, options)),
      primaryStructure: affects ? "error_can_change_conclusion" : "error_cannot_change_conclusion",
      secondarySkillIds: ["C-EST-03"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { center, errorUpper, threshold, affects },
    });
  }

  const current =
    difficultyBand === "L1"
      ? choose(context, [1, 3, 5] as const)
      : difficultyBand === "L2"
        ? choose(context, [1, 2, 3, 4] as const)
        : choose(context, [1, 2.5, 3, 4, 5] as const);
  const target = choose(context, difficultyBand === "L1" ? [3, 5] as const : [1, 3, 5] as const);
  const answer = current <= target ? "stop" : "continue";
  const options = [
    { value: "stop", label: "停止，已满足目标精度" },
    { value: "continue", label: "继续，还没满足目标精度" },
  ];
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `当前估计相对误差约 ${current}%，目标误差≤${target}%。现在应停止还是继续？`,
    answer,
    data: choiceData({ currentError: current, targetError: target }, shuffle(context, options)),
    primaryStructure: answer === "stop" ? "precision_stop" : "precision_continue",
    secondarySkillIds: ["C-EST-10"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { current, target },
  });
}

function scaleStep(
  id: string,
  stepSkillId: SkillId,
  stepType: string,
  prompt: string,
  inputKind: StructuredInputKind,
  expectedValue: AnswerValue,
  options?: readonly QuestionStepChoice[],
  acceptedRange?: { min: number; max: number },
): QuestionStepSpec {
  return {
    id,
    stepSkillId,
    stepType,
    prompt,
    inputKind,
    expectedValue,
    allowedAnswerSet: [expectedValue],
    choices: options ? [...options] : undefined,
    acceptedRange,
  };
}

function xpScaleQuestion(
  skillId: Extract<Batch7SkillId, `C-XP-SCALE-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  if (skillId === "C-XP-SCALE-01") {
    const byBand = {
      L1: { a: 398, b: 257, anchor: 400 },
      L2: { a: 996, b: 487, anchor: 1000 },
      L3: { a: 2497, b: 1688, anchor: 2500 },
    } as const;
    const template = byBand[difficultyBand];
    const delta = template.anchor - template.a;
    const adjustedB = template.b - delta;
    const result = template.a + template.b;
    const anchorOptions = shuffle(context, [template.anchor, template.anchor - 10, template.anchor + 10].map((value) => ({
      value: String(value),
      label: String(value),
    })));
    const steps = [
      scaleStep("anchor", "B-BASE-02", "choose_anchor", `先把 ${template.a} 调到哪个整基准最省？`, "choice", String(template.anchor), anchorOptions),
      scaleStep("compensate", skillId, "opposite_compensation", `第一项变化 ${delta > 0 ? "+" : ""}${delta}，为了保持和不变，第二项 ${template.b} 应调为：`, "number", String(adjustedB)),
      scaleStep("result", "C-ADD-01", "final_result", `${template.anchor}+${adjustedB}=`, "number", String(result)),
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${template.a}+${template.b}，用加法补偿凑整完成计算。`,
      answer: String(result),
      data: { a: template.a, b: template.b, anchor: template.anchor, adjustedB, delta },
      primaryStructure: "addition_exact_compensation",
      secondarySkillIds: ["B-BASE-02", "A-COM-02", "C-ADD-01"],
      inputKind: "steps",
      stepSpecs: steps,
      generatorParams: { a: template.a, b: template.b, anchor: template.anchor, adjustedB, delta },
    });
  }

  if (skillId === "C-XP-SCALE-02") {
    const byBand = {
      L1: { a: 603, b: 287, anchor: 600 },
      L2: { a: 1004, b: 668, anchor: 1000 },
      L3: { a: 2507, b: 1689, anchor: 2500 },
    } as const;
    const template = byBand[difficultyBand];
    const delta = template.anchor - template.a;
    const adjustedB = template.b + delta;
    const result = template.a - template.b;
    const anchorOptions = shuffle(context, [template.anchor, template.anchor - 10, template.anchor + 10].map((value) => ({
      value: String(value),
      label: String(value),
    })));
    const steps = [
      scaleStep("anchor", "B-BASE-02", "choose_anchor", `先把被减数 ${template.a} 调到哪个整基准？`, "choice", String(template.anchor), anchorOptions),
      scaleStep("compensate", skillId, "same_direction_compensation", `被减数变化 ${delta > 0 ? "+" : ""}${delta}，为保持差不变，减数 ${template.b} 同向调为：`, "number", String(adjustedB)),
      scaleStep("result", "C-ADD-01", "final_result", `${template.anchor}-${adjustedB}=`, "number", String(result)),
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${template.a}-${template.b}，用减法同向补偿凑整完成计算。`,
      answer: String(result),
      data: { a: template.a, b: template.b, anchor: template.anchor, adjustedB, delta },
      primaryStructure: "subtraction_same_direction_compensation",
      secondarySkillIds: ["B-BASE-02", "A-COM-02", "A-SUB-01"],
      inputKind: "steps",
      stepSpecs: steps,
      generatorParams: { a: template.a, b: template.b, anchor: template.anchor, adjustedB, delta },
    });
  }

  const byBand = {
    L1: { a: 48, b: 203, adjustedA: 50, adjustedB: 195 },
    L2: { a: 62, b: 147, adjustedA: 60, adjustedB: 152 },
    L3: { a: 73, b: 184, adjustedA: 75, adjustedB: 179 },
  } as const;
  const template = byBand[difficultyBand];
  const exact = template.a * template.b;
  const approximate = template.adjustedA * template.adjustedB;
  const resultRange = relativeRange(exact, 0.01);
  const firstOptions = shuffle(context, [template.adjustedA, template.adjustedA - 5, template.adjustedA + 5].map((value) => ({
    value: String(value),
    label: String(value),
  })));
  const secondOptions = shuffle(context, [template.adjustedB, template.adjustedB - 5, template.adjustedB + 5].map((value) => ({
    value: String(value),
    label: String(value),
  })));
  const steps = [
    scaleStep("first_factor", "B-BASE-01", "round_first_factor", `因子 ${template.a} 先调到哪个整基准更省？`, "choice", String(template.adjustedA), firstOptions),
    scaleStep("reverse_factor", skillId, "reverse_compensation", `为反向补偿第一因子的变化，${template.b} 选哪个附近新因子最合适？`, "choice", String(template.adjustedB), secondOptions),
    scaleStep("approx_product", skillId, "approximate_product", `${template.adjustedA}×${template.adjustedB}≈`, "number", String(approximate), undefined, resultRange),
  ];
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${template.a}×${template.b}，用乘法反向补偿把两个因子变得更好算。`,
    answer: String(approximate),
    acceptedRange: resultRange,
    data: { a: template.a, b: template.b, adjustedA: template.adjustedA, adjustedB: template.adjustedB, exact, approximate },
    primaryStructure: "multiplication_reverse_compensation",
    secondarySkillIds: ["B-BASE-01", "B-APP-05", "C-EST-06"],
    targetPrecision: "1%",
    inputKind: "steps",
    stepSpecs: steps,
    generatorParams: { a: template.a, b: template.b, adjustedA: template.adjustedA, adjustedB: template.adjustedB, exact, approximate },
  });
}

function compareOptions(answer: "left" | "right" | "equal") {
  return [
    { value: "left", label: "左边更大" },
    { value: "right", label: "右边更大" },
    { value: "equal", label: "相等" },
  ].map((option) => ({ ...option, value: option.value as string }));
}

function compareAnswer(left: number, right: number): "left" | "right" | "equal" {
  const difference = left - right;
  if (Math.abs(difference) <= 1e-12) return "equal";
  return difference > 0 ? "left" : "right";
}

function compareQuestion(
  skillId: Extract<Batch7SkillId, `C-CMP-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  if (skillId === "C-CMP-01") {
    const digits = difficultyBand === "L1" ? 3 : difficultyBand === "L2" ? 5 : 6;
    const base = 10 ** (digits - 1);
    const left = randomInteger(context, base, base * 10 - 1);
    const gap = difficultyBand === "L3" ? randomInteger(context, 1, 50) : randomInteger(context, 50, 500);
    const right = context.random() < 0.5 ? left + gap : left - gap;
    const answer = compareAnswer(left, right);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `比较 ${left} 与 ${right}：`,
      answer,
      data: choiceData({ left, right }, shuffle(context, compareOptions(answer))),
      primaryStructure: "integer_comparison",
      secondarySkillIds: ["A-PLACE-05"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { left, right },
    });
  }

  if (skillId === "C-CMP-02") {
    const decimal = difficultyBand === "L1" ? 0.375 : difficultyBand === "L2" ? 0.286 : 0.167;
    const percent = decimal * 100 + (difficultyBand === "L3" ? -0.1 : 0.2);
    const answer = compareAnswer(decimal, percent / 100);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `比较小数 ${cleanNumber(decimal, 3)} 与 ${cleanNumber(percent, 1)}%：`,
      answer,
      data: choiceData({ left: decimal, right: percent / 100, percent }, shuffle(context, compareOptions(answer))),
      primaryStructure: "decimal_percent_comparison",
      secondarySkillIds: ["A-PLACE-04", "A-FRA-04"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { decimal, percent },
    });
  }

  if (skillId === "C-CMP-03") {
    const templates = [
      { numerator: 3, denominator: 8, percent: 37.4 },
      { numerator: 2, denominator: 7, percent: 28.7 },
      { numerator: 1, denominator: 6, percent: 16.6 },
    ] as const;
    const template = choose(context, difficultyBand === "L1" ? templates.slice(0, 1) : templates);
    const fraction = template.numerator / template.denominator;
    const answer = compareAnswer(fraction, template.percent / 100);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `比较 ${template.numerator}/${template.denominator} 与 ${template.percent}%：`,
      answer,
      data: choiceData({ numerator: template.numerator, denominator: template.denominator, percent: template.percent }, shuffle(context, compareOptions(answer))),
      primaryStructure: "fraction_percent_comparison",
      secondarySkillIds: ["A-FRA-02", "B-FPSPLIT-11"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { numerator: template.numerator, denominator: template.denominator, percent: template.percent },
    });
  }

  if (skillId === "C-CMP-04") {
    const byBand = {
      L1: [3, 7, 4, 9],
      L2: [17, 43, 19, 47],
      L3: [37, 91, 41, 101],
    } as const;
    const [a, b, c, d] = byBand[difficultyBand];
    const answer = compareAnswer(a / b, c / d);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `比较 ${a}/${b} 与 ${c}/${d}：`,
      answer,
      data: choiceData({ a, b, c, d }, shuffle(context, compareOptions(answer))),
      primaryStructure: "fraction_fraction_comparison",
      secondarySkillIds: ["A-FRA-04", "B-APP-05"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { a, b, c, d },
    });
  }

  if (skillId === "C-CMP-05") {
    const templates = [
      { left: 0.48, baseline: 0.5, leftLabel: "48%", baselineLabel: "50%" },
      { left: 1.02, baseline: 1, leftLabel: "1.02", baselineLabel: "1" },
      { left: 0.009, baseline: 0.01, leftLabel: "0.9%", baselineLabel: "1%" },
    ] as const;
    const template = choose(context, difficultyBand === "L1" ? templates.slice(0, 2) : templates);
    const answer = compareAnswer(template.left, template.baseline);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `比较 ${template.leftLabel} 与基准 ${template.baselineLabel}：`,
      answer,
      data: choiceData({ left: template.left, right: template.baseline }, shuffle(context, compareOptions(answer))),
      primaryStructure: "baseline_comparison",
      secondarySkillIds: ["A-FRA-01", "A-PLACE-04"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { left: template.left, baseline: template.baseline },
    });
  }

  const divisor = randomInteger(context, difficultyBand === "L1" ? 20 : 80, difficultyBand === "L3" ? 900 : 300);
  const threshold = difficultyBand === "L1" ? choose(context, [1.5, 2, 3] as const) : choose(context, [0.8, 1.2, 2.5, 4] as const);
  const isAbove = context.random() < 0.5;
  const quotient = threshold * (isAbove ? 1.08 : 0.92);
  const dividend = Math.max(1, Math.round(divisor * quotient));
  const actualAbove = dividend / divisor > threshold;
  const answer = actualAbove ? "yes" : "no";
  const options = [
    { value: "yes", label: "大于阈值" },
    { value: "no", label: "不大于阈值" },
  ];
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `不求完整商，只判断 ${dividend}÷${divisor} 是否大于 ${threshold}：`,
    answer,
    data: choiceData({ dividend, divisor, threshold }, shuffle(context, options)),
    primaryStructure: "quotient_threshold_comparison",
    secondarySkillIds: ["C-DIV-05", "B-APP-05"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { dividend, divisor, threshold, quotient: dividend / divisor },
  });
}

export function generateBatch7SkillQuestion(
  skillId: Batch7SkillId,
  difficultyBand: DifficultyBand,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (skillId.startsWith("B-ORDER-"))
    return orderQuestion(skillId as Extract<Batch7SkillId, `B-ORDER-${string}`>, difficultyBand, context);
  if (skillId === "B-SPLIT-01" || skillId === "B-SPLIT-02")
    return splitQuestion(skillId, difficultyBand, context);
  if (skillId === "B-MSPLIT-01" || skillId === "B-MSPLIT-02")
    return multiplicationSplitQuestion(skillId, difficultyBand, context);
  if (skillId === "B-CONV-01" || skillId === "B-CONV-02")
    return conversionQuestion(skillId, difficultyBand, context);
  if (skillId.startsWith("C-ADD-"))
    return addExpressionQuestion(skillId as Extract<Batch7SkillId, `C-ADD-${string}`>, difficultyBand, context);
  if (skillId.startsWith("C-EST-"))
    return estimationQuestion(skillId as Extract<Batch7SkillId, `C-EST-${string}`>, difficultyBand, context);
  if (skillId.startsWith("C-XP-SCALE-"))
    return xpScaleQuestion(skillId as Extract<Batch7SkillId, `C-XP-SCALE-${string}`>, difficultyBand, context);
  return compareQuestion(skillId as Extract<Batch7SkillId, `C-CMP-${string}`>, difficultyBand, context);
}

export function generateBatch7SkillSet(
  skillId: Batch7SkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    generateBatch7SkillQuestion(skillId, difficultyBand, context),
  );
}

export function gradeBatch7SkillQuestion(
  questionToGrade: GeneratedQuestion,
  input: string,
) {
  if (questionToGrade.type !== "skill_drill" || !isBatch7SkillId(questionToGrade.skillId))
    throw new Error("Only implemented batch-7 skill drills can use this grader.");

  const normalizedInput = input.trim();
  const allowed = questionToGrade.allowedAnswerSet?.map(String) ?? [];
  if (allowed.includes(normalizedInput))
    return { isCorrect: true, accuracyLevel: "exact" as const };

  if (questionToGrade.inputKind === "choice" || questionToGrade.inputKind === "sequence") {
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
  const accepted = range !== undefined && actual >= range.min && actual <= range.max;
  return {
    isCorrect: accepted,
    accuracyLevel: accepted ? ("accepted" as const) : ("wrong" as const),
  };
}
