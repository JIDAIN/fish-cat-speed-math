import { GenerationContext, productionGenerationContext } from "./generate";
import { getSkillDefinition } from "./skill-registry";
import {
  AnswerValue,
  DifficultyBand,
  GeneratedQuestion,
  SkillId,
  StructuredInputKind,
  TargetPrecision,
} from "./types";

export const BATCH4_SKILL_GENERATOR_VERSION = "stage4-batch4-1.0.0";

export const batch4SkillIds = [
  "B-BASE-01",
  "B-BASE-02",
  "B-BASE-03",
  "B-BASE-04",
  "B-BASE-05",
  "B-PSPLIT-01",
  "B-PSPLIT-02",
  "B-R-01",
  "B-R-02",
  "B-R-03",
  "B-R-04",
  "B-R-05",
  "B-R-06",
  "B-R-07",
  "B-RMUL-01",
  "B-RMUL-02",
  "B-RMUL-03",
  "B-RMUL-04",
  "B-RMUL-05",
  "B-APP-01",
  "B-APP-02",
  "B-APP-03",
  "B-APP-04",
  "B-APP-05",
  "C-DIV-05",
  "C-DIV-06",
  "C-DIV-07",
  "C-DIV-08",
  "C-DIV-09",
  "C-DIV-10",
  "C-DIV-11",
  "C-DIV-12",
  "C-DIV-13",
] as const satisfies readonly SkillId[];

export type Batch4SkillId = (typeof batch4SkillIds)[number];

const batch4SkillSet = new Set<string>(batch4SkillIds);

export function isBatch4SkillId(value: unknown): value is Batch4SkillId {
  return typeof value === "string" && batch4SkillSet.has(value);
}

type ChoiceOption = { value: string; label: string };

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
  skillId: Batch4SkillId;
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
    generationRuleVersion: BATCH4_SKILL_GENERATOR_VERSION,
    skillId: input.skillId,
    secondarySkillIds: input.secondarySkillIds ?? [],
    difficultyBand: input.difficultyBand,
    structureTags,
    targetPrecision: input.targetPrecision ?? "exact",
    generatorParams: {
      generatorFamily:
        definition.layer === "B" ? "b_high_frequency_transform" : "c_direct_division_step",
      implementationBatch: "stage4_batch4",
      ...(input.generatorParams ?? {}),
    },
    allowedAnswerSet: input.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind,
  };
}

function nearestAnchorQuestion(
  skillId: Extract<Batch4SkillId, "B-BASE-01" | "B-BASE-02" | "B-BASE-03">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const config =
    skillId === "B-BASE-01"
      ? { unit: 10, minMultiplier: 3, maxMultiplier: 99, label: "整十" }
      : skillId === "B-BASE-02"
        ? { unit: 100, minMultiplier: 2, maxMultiplier: 99, label: "整百" }
        : { unit: 1000, minMultiplier: 2, maxMultiplier: 99, label: "整千" };
  const anchor =
    randomInteger(context, config.minMultiplier, config.maxMultiplier) * config.unit;
  const deltaMax =
    config.unit === 10
      ? difficultyBand === "L1"
        ? 2
        : 4
      : difficultyBand === "L1"
        ? Math.floor(config.unit * 0.15)
        : difficultyBand === "L2"
          ? Math.floor(config.unit * 0.32)
          : Math.floor(config.unit * 0.49);
  const deltaMin = difficultyBand === "L3" && config.unit > 10 ? Math.floor(config.unit * 0.35) : 1;
  const delta = randomInteger(context, Math.max(1, deltaMin), Math.max(1, deltaMax));
  const direction = context.random() < 0.5 ? -1 : 1;
  const value = anchor + direction * delta;
  const candidates = [anchor - config.unit, anchor, anchor + config.unit]
    .filter((candidate) => candidate > 0)
    .map((candidate) => ({ value: String(candidate), label: String(candidate) }));
  const options = shuffle(context, candidates);
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `为 ${value} 选择最近、最好算的${config.label}基准：`,
    answer: String(anchor),
    data: choiceData({ value, anchor, delta, unit: config.unit }, options),
    primaryStructure: `nearest_${config.unit}_anchor`,
    inputKind: "choice",
    allowedAnswerSet: [String(anchor)],
    generatorParams: { value, anchor, unit: config.unit, absoluteDelta: delta },
  });
}

const percentAnchors = [100, 50, 25, 20, 10, 5, 1, 0.1] as const;

function percentAnchorQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const candidatesByBand: Record<DifficultyBand, readonly number[]> = {
    L1: [50, 25, 20, 10],
    L2: [100, 50, 25, 20, 10, 5, 1],
    L3: [...percentAnchors],
  };
  const percent = choose(context, candidatesByBand[difficultyBand]);
  const denominator =
    difficultyBand === "L3"
      ? randomInteger(context, 1, 5) * 1000
      : randomInteger(context, 2, 50) * 100;
  const jitterLimit = difficultyBand === "L1" ? 0 : difficultyBand === "L2" ? 0.4 : 0.9;
  const jitterPercent = (context.random() * 2 - 1) * jitterLimit;
  const amount = Number(
    ((denominator * (percent + jitterPercent)) / 100).toFixed(1),
  );
  const distractors = percentAnchors
    .filter((candidate) => candidate !== percent)
    .sort((left, right) => Math.abs(left - percent) - Math.abs(right - percent))
    .slice(0, 3);
  const options = shuffle(
    context,
    [percent, ...distractors].map((candidate) => ({
      value: cleanNumber(candidate, 1),
      label: `${cleanNumber(candidate, 1)}%`,
    })),
  );
  return question({
    context,
    skillId: "B-BASE-04",
    difficultyBand,
    prompt: `${cleanNumber(amount, 1)} 大约是 ${denominator} 的哪个百分比锚点？`,
    answer: cleanNumber(percent, 1),
    data: choiceData(
      { amount, denominator, percentAnchor: percent, jitterPercent },
      options,
    ),
    primaryStructure: "percent_anchor_recognition",
    secondarySkillIds: ["A-PCT-02"],
    inputKind: "choice",
    allowedAnswerSet: [cleanNumber(percent, 1)],
    generatorParams: { amount, denominator, percentAnchor: percent, jitterPercent },
  });
}

const reciprocalAnchors = [
  { effective: 0.333, fraction: "1/3" },
  { effective: 0.25, fraction: "1/4" },
  { effective: 0.2, fraction: "1/5" },
  { effective: 0.167, fraction: "1/6" },
  { effective: 0.143, fraction: "1/7" },
  { effective: 0.125, fraction: "1/8" },
  { effective: 0.111, fraction: "1/9" },
  { effective: 0.286, fraction: "2/7" },
  { effective: 0.667, fraction: "2/3" },
] as const;

function reciprocalAnchorQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const anchor = choose(context, reciprocalAnchors);
  const distractors = reciprocalAnchors
    .filter((candidate) => candidate.fraction !== anchor.fraction)
    .sort(
      (left, right) =>
        Math.abs(left.effective - anchor.effective) -
        Math.abs(right.effective - anchor.effective),
    )
    .slice(0, 3);
  const options = shuffle(
    context,
    [anchor, ...distractors].map((candidate) => ({
      value: candidate.fraction,
      label: candidate.fraction,
    })),
  );
  const display =
    difficultyBand === "L3"
      ? `${cleanNumber(anchor.effective * 100, 1)}%`
      : cleanNumber(anchor.effective, 3);
  return question({
    context,
    skillId: "B-BASE-05",
    difficultyBand,
    prompt: `${display} 最接近哪个常用倒数 / 分数锚点？`,
    answer: anchor.fraction,
    data: choiceData(
      { effectiveValue: anchor.effective, anchorFraction: anchor.fraction },
      options,
    ),
    primaryStructure: "reciprocal_fraction_anchor",
    secondarySkillIds: ["A-FRA-01"],
    inputKind: "choice",
    allowedAnswerSet: [anchor.fraction],
    generatorParams: {
      effectiveValue: anchor.effective,
      anchorFraction: anchor.fraction,
      displayMode: difficultyBand === "L3" ? "percent" : "decimal",
    },
  });
}

type PercentSplitTemplate = {
  target: number;
  allowed: readonly string[];
};

const percentSplitTemplates: Record<DifficultyBand, readonly PercentSplitTemplate[]> = {
  L1: [
    { target: 7, allowed: ["5,2"] },
    { target: 13, allowed: ["10,3"] },
    { target: 23, allowed: ["20,3"] },
  ],
  L2: [
    { target: 17, allowed: ["10,5,2", "12.5,2.5,2"] },
    { target: 27.5, allowed: ["25,2.5"] },
    { target: 32.5, allowed: ["20,12.5"] },
  ],
  L3: [
    { target: 38, allowed: ["25,10,3"] },
    { target: 18, allowed: ["10,5,3", "12.5,3,2.5"] },
    { target: 30.5, allowed: ["25,3,2.5"] },
  ],
};

function percentSplitQuestion(
  skillId: Extract<Batch4SkillId, "B-PSPLIT-01" | "B-PSPLIT-02">,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (skillId === "B-PSPLIT-01") {
    let template = choose(context, percentSplitTemplates[difficultyBand]);
    // Keep every emitted block inside the V1 basic-block palette.
    if (template.allowed.some((path) => path.includes("7.5"))) {
      template = { target: 35.5, allowed: ["25,7.5,3"] };
    }
    const allowed = template.allowed.map((path) =>
      path.replace("7.5", "5,2.5"),
    );
    const canonical = allowed[0];
    const canonicalBlocks = canonical.split(",").map(Number);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `把 ${cleanNumber(template.target, 1)}% 拆成最低成本的基础百分比块，按从大到小输入。`,
      answer: canonical,
      data: {
        targetPercent: template.target,
        canonicalBlocks,
      },
      primaryStructure: "percent_block_composition",
      secondarySkillIds: ["A-PCT-02", "A-PCT-06", "A-PCT-07"],
      inputKind: "percent_blocks",
      allowedAnswerSet: allowed,
      generatorParams: {
        targetPercent: template.target,
        canonicalPath: canonical,
      },
    });
  }

  const templateByBand: Record<
    DifficultyBand,
    { target: number; answer: string; paths: readonly string[] }
  > = {
    L1: {
      target: 15,
      answer: "10,5",
      paths: ["10,5", "5,5,5", "10,2,2,1"],
    },
    L2: {
      target: 27.5,
      answer: "25,2.5",
      paths: ["25,2.5", "20,5,2.5", "10,10,5,2.5"],
    },
    L3: {
      target: 32.5,
      answer: "20,12.5",
      paths: ["20,12.5", "25,5,2.5", "20,5,5,2.5"],
    },
  };
  const template = templateByBand[difficultyBand];
  const options = shuffle(
    context,
    template.paths.map((path) => ({
      value: path,
      label: path
        .split(",")
        .map((part) => `${part}%`)
        .join(" + "),
    })),
  );
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${cleanNumber(template.target, 1)}% 有多种拆法，选计算块最少、成本最低的一组：`,
    answer: template.answer,
    data: choiceData({ targetPercent: template.target }, options),
    primaryStructure: "lowest_cost_percent_split",
    secondarySkillIds: ["A-PCT-02", "A-PCT-06", "A-PCT-07"],
    inputKind: "choice",
    allowedAnswerSet: [template.answer],
    generatorParams: { targetPercent: template.target, bestPath: template.answer },
  });
}

function rQuestion(
  skillId: Extract<Batch4SkillId, `B-R-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (skillId === "B-R-01") {
    const baseline = randomInteger(context, 150, 900);
    const maxDiff = difficultyBand === "L1" ? 20 : difficultyBand === "L2" ? 60 : 100;
    const minDiff = difficultyBand === "L3" ? 40 : 1;
    const difference = randomInteger(context, minDiff, maxDiff);
    const direction = context.random() < 0.5 ? -1 : 1;
    const value = baseline + direction * difference;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 与基准 ${baseline} 相差多少？`,
      answer: String(difference),
      data: { value, baseline, difference, direction },
      primaryStructure: "absolute_difference_for_r",
      secondarySkillIds: ["A-SUB-01"],
      generatorParams: { value, baseline, difference, direction },
    });
  }

  if (skillId === "B-R-02") {
    const baseline = randomInteger(context, 80, 900);
    const value = baseline + (context.random() < 0.5 ? -1 : 1) * randomInteger(context, 3, 60);
    const difference = Math.abs(value - baseline);
    const options = shuffle(context, [
      { value: String(baseline), label: String(baseline) },
      { value: String(value), label: String(value) },
      { value: String(difference), label: String(difference) },
    ]);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `计算“${value} 相对 ${baseline} 的偏差率”时，分母应该取哪个基准？`,
      answer: String(baseline),
      data: choiceData({ value, baseline, difference }, options),
      primaryStructure: "r_denominator_baseline_choice",
      inputKind: "choice",
      allowedAnswerSet: [String(baseline)],
      generatorParams: { value, baseline, difference },
    });
  }

  if (skillId === "B-R-03" || skillId === "B-R-04") {
    const baseline = randomInteger(context, 5, difficultyBand === "L1" ? 20 : 100) * 10;
    const intendedPercent = choose(
      context,
      difficultyBand === "L1"
        ? [1, 2, 3, 5, 10]
        : difficultyBand === "L2"
          ? [1.5, 2.5, 4, 6, 8]
          : [1.3, 2.7, 4.6, 6.5, 9.3],
    );
    const difference = Math.max(
      1,
      Number(((baseline * intendedPercent) / 100).toFixed(1)),
    );
    const percent = (difference / baseline) * 100;
    const tolerance =
      skillId === "B-R-03" ? Math.max(percent * 0.02, 0.02) : 0.1;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt:
        skillId === "B-R-03"
          ? `${cleanNumber(difference, 1)} ÷ ${baseline} ≈ ?%（只填数字）`
          : `把 ${cleanNumber(difference, 1)}/${baseline} 换成百分数：?%（只填数字）`,
      answer: cleanNumber(percent, 3),
      acceptedRange: acceptedAround(percent, tolerance),
      data: { difference, baseline, percent },
      primaryStructure:
        skillId === "B-R-03" ? "difference_divide_baseline" : "fraction_to_percent_for_r",
      secondarySkillIds: skillId === "B-R-04" ? ["A-FRA-04"] : ["A-PLACE-03"],
      targetPrecision: "range",
      generatorParams: { difference, baseline, percent, tolerancePercentPoints: tolerance },
    });
  }

  if (skillId === "B-R-05") {
    const baseline = randomInteger(context, 80, 900);
    const positive = context.random() < 0.5;
    const difference = randomInteger(context, 2, difficultyBand === "L3" ? 100 : 40);
    const value = baseline + (positive ? difference : -difference);
    const answer = positive ? "positive" : "negative";
    const options = [
      { value: "positive", label: "正" },
      { value: "negative", label: "负" },
    ];
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 相对基准 ${baseline} 的 r 是正还是负？`,
      answer,
      data: choiceData({ value, baseline, difference }, options),
      primaryStructure: positive ? "positive_r_direction" : "negative_r_direction",
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { value, baseline, direction: answer },
    });
  }

  if (skillId === "B-R-06") {
    const anchorsByBand: Record<DifficultyBand, readonly number[]> = {
      L1: [2, 3, 5, 10],
      L2: [3, 5, 8, 10, 12.5, 15],
      L3: [3, 5, 8, 10, 12.5, 15, 20],
    };
    const anchor = choose(context, anchorsByBand[difficultyBand]);
    const maxOffset = difficultyBand === "L1" ? 0.2 : difficultyBand === "L2" ? 0.4 : 0.6;
    const signedOffset = (context.random() < 0.5 ? -1 : 1) * maxOffset;
    const raw = anchor + signedOffset;
    const budget = maxOffset + 0.15;
    const distractors = anchorsByBand[difficultyBand]
      .filter((candidate) => candidate !== anchor)
      .sort((left, right) => Math.abs(left - raw) - Math.abs(right - raw))
      .slice(0, 2);
    const options = shuffle(
      context,
      [anchor, ...distractors].map((candidate) => ({
        value: cleanNumber(candidate, 1),
        label: `${cleanNumber(candidate, 1)}%`,
      })),
    );
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${cleanNumber(raw, 1)}% 若允许约 ±${cleanNumber(budget, 1)} 个百分点，最适合粗略化为哪个易算 r？`,
      answer: cleanNumber(anchor, 1),
      data: choiceData({ rawPercent: raw, anchorPercent: anchor, errorBudget: budget }, options),
      primaryStructure: "r_low_cost_approximation",
      inputKind: "choice",
      allowedAnswerSet: [cleanNumber(anchor, 1)],
      generatorParams: { rawPercent: raw, anchorPercent: anchor, errorBudget: budget },
    });
  }

  const baseline = randomInteger(context, 1, 10) * 500;
  const percent = choose(
    context,
    difficultyBand === "L1"
      ? [2, 3, 5, 8]
      : difficultyBand === "L2"
        ? [2.4, 3.6, 4.5, 6.5]
        : [2.4, 3.6, 6.5, 7.2, 8.4],
  );
  const onePercent = baseline / 100;
  const difference = (baseline * percent) / 100;
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `基准 ${baseline}，差值 ${cleanNumber(difference, 1)}。已知 1%=${cleanNumber(onePercent, 2)}，估 r≈?%（只填数字）`,
    answer: cleanNumber(percent, 1),
    acceptedRange: acceptedAround(percent, 0.3),
    data: { baseline, difference, onePercent, percent },
    primaryStructure: "estimate_r_from_one_percent",
    secondarySkillIds: ["A-PLACE-03"],
    targetPrecision: "range",
    generatorParams: { baseline, difference, onePercent, percent },
  });
}

const singleRBlocks = [1, 2, 2.5, 3, 5, 10, 12.5, 20, 25, 50] as const;
const compositeRByBand: Record<DifficultyBand, readonly number[]> = {
  L1: [7, 13, 15],
  L2: [17, 23, 27.5],
  L3: [13, 17, 23, 27, 29],
};

function rMultiplyQuestion(
  skillId: Extract<Batch4SkillId, `B-RMUL-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const value =
    difficultyBand === "L1"
      ? randomInteger(context, 1, 80) * 100
      : randomInteger(context, 50, 9999);

  let percent: number;
  if (skillId === "B-RMUL-01") percent = choose(context, singleRBlocks);
  else if (skillId === "B-RMUL-03") percent = choose(context, [13, 17, 23, 27, 29] as const);
  else percent = choose(context, compositeRByBand[difficultyBand]);

  const negative = skillId === "B-RMUL-04";
  const signedPercent = negative ? -percent : percent;
  const result = (value * signedPercent) / 100;

  if (skillId === "B-RMUL-05") {
    const targetPrecision: Extract<TargetPrecision, "1%" | "3%" | "5%"> =
      difficultyBand === "L1" ? "5%" : difficultyBand === "L2" ? "3%" : "1%";
    const toleranceRatio = targetPrecision === "5%" ? 0.05 : targetPrecision === "3%" ? 0.03 : 0.01;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `估算 ${value}×${cleanNumber(percent, 1)}%，只需保证相对误差≤${targetPrecision}：`,
      answer: cleanNumber(result, 4),
      acceptedRange: acceptedAround(result, Math.abs(result) * toleranceRatio),
      data: { value, percent, result, toleranceRatio },
      primaryStructure: "approximate_number_times_r",
      secondarySkillIds: ["B-PSPLIT-01"],
      targetPrecision,
      generatorParams: { value, percent, toleranceRatio },
    });
  }

  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `计算 ${value}×${negative ? "-" : ""}${cleanNumber(percent, 1)}%：`,
    answer: cleanNumber(result, 4),
    acceptedRange: acceptedAround(result, Math.max(0.01, Math.abs(result) * 0.001)),
    data: { value, percent: signedPercent, result },
    primaryStructure:
      skillId === "B-RMUL-01"
        ? "single_percent_block_times_r"
        : skillId === "B-RMUL-02"
          ? "combined_percent_blocks_times_r"
          : skillId === "B-RMUL-03"
            ? "two_digit_percent_times_r"
            : "negative_r_adjustment",
    secondarySkillIds:
      skillId === "B-RMUL-01" ? ["A-PCT-02"] : ["B-PSPLIT-01"],
    targetPrecision: "range",
    generatorParams: { value, percent: signedPercent },
  });
}

function roundToUnit(value: number, unit: number) {
  return Math.round(value / unit) * unit;
}

function roundToSignificant(value: number, digits: number) {
  if (value === 0) return 0;
  const power = Math.floor(Math.log10(Math.abs(value)));
  const unit = 10 ** (power - digits + 1);
  return Math.round(value / unit) * unit;
}

function approximationQuestion(
  skillId: Extract<Batch4SkillId, `B-APP-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (skillId === "B-APP-01") {
    const unit = difficultyBand === "L1" ? 10 : difficultyBand === "L2" ? 100 : 1000;
    let value = randomInteger(context, unit, Math.min(99999, unit * 80 - 1));
    if (value % unit === 0) value += Math.floor(unit / 3);
    const result = roundToUnit(value, unit);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 四舍五入到${unit === 10 ? "整十" : unit === 100 ? "整百" : "整千"}：`,
      answer: String(result),
      data: { value, unit, result },
      primaryStructure: "round_half_up_to_unit",
      inputKind: "number",
      generatorParams: { value, unit },
    });
  }

  if (skillId === "B-APP-02" || skillId === "B-APP-03") {
    const unit = difficultyBand === "L1" ? 10 : difficultyBand === "L2" ? 100 : 1000;
    const anchor = randomInteger(context, 2, 20) * unit;
    const delta = difficultyBand === "L1" ? Math.max(1, Math.floor(unit * 0.2)) : difficultyBand === "L2" ? Math.floor(unit * 0.18) : Math.floor(unit * 0.08);
    const upward = skillId === "B-APP-02";
    const value = upward ? anchor - delta : anchor + delta;
    const answer = String(anchor);
    const alternatives = upward
      ? [anchor, anchor + unit, anchor + 2 * unit]
      : [anchor, Math.max(unit, anchor - unit), Math.max(unit, anchor - 2 * unit)];
    const options = shuffle(
      context,
      alternatives.map((candidate) => ({ value: String(candidate), label: String(candidate) })),
    );
    const errorPercent = (Math.abs(anchor - value) / value) * 100;
    const budget = Number((errorPercent + 0.5).toFixed(1));
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${value} 若主动${upward ? "向上" : "向下"}取一个更好算的近似数，且改动≤约 ${budget}%，选哪个？`,
      answer,
      data: choiceData({ value, anchor, errorBudgetPercent: budget }, options),
      primaryStructure: upward ? "active_round_up" : "active_round_down",
      secondarySkillIds: ["B-BASE-01"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { value, anchor, errorBudgetPercent: budget, direction: upward ? "up" : "down" },
    });
  }

  if (skillId === "B-APP-04") {
    const digits = difficultyBand === "L1" ? 2 : difficultyBand === "L2" ? 3 : choose(context, [2, 3] as const);
    const raw = randomInteger(context, 1234, 98765);
    const value = difficultyBand === "L3" ? raw / 10 : raw;
    const result = roundToSignificant(value, digits);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${cleanNumber(value, 1)} 保留 ${digits} 位有效数字：`,
      answer: cleanNumber(result, 6),
      data: { value, significantDigits: digits, result },
      primaryStructure: "significant_digit_rounding",
      inputKind: "number",
      secondarySkillIds: ["A-PLACE-06"],
      generatorParams: { value, significantDigits: digits },
    });
  }

  const templates =
    difficultyBand === "L1"
      ? [
          { value: 47, budget: 7, answer: "50", choices: ["50", "47", "60"] },
          { value: 98, budget: 3, answer: "100", choices: ["100", "98", "90"] },
        ]
      : difficultyBand === "L2"
        ? [
            { value: 397, budget: 3, answer: "400", choices: ["400", "390", "397", "500"] },
            { value: 603, budget: 2, answer: "600", choices: ["600", "610", "603", "700"] },
          ]
        : [
            { value: 1003, budget: 1, answer: "1000", choices: ["1000", "1010", "1003", "1100"] },
            { value: 1996, budget: 1, answer: "2000", choices: ["2000", "1990", "1996", "2100"] },
          ];
  const template = choose(context, templates);
  const options = shuffle(
    context,
    template.choices.map((candidate) => ({ value: candidate, label: candidate })),
  );
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `在误差预算≤${template.budget}%内，为后续乘除把 ${template.value} 近似成哪个数最省算？`,
    answer: template.answer,
    data: choiceData(
      { value: template.value, errorBudgetPercent: template.budget },
      options,
    ),
    primaryStructure: "lowest_cost_approximation",
    secondarySkillIds: ["B-BASE-02"],
    inputKind: "choice",
    allowedAnswerSet: [template.answer],
    generatorParams: {
      value: template.value,
      errorBudgetPercent: template.budget,
      bestApproximation: template.answer,
    },
  });
}

function leadingSignificantDigits(value: number, count: number) {
  const absolute = Math.abs(value);
  if (absolute === 0) return "0";
  const scale = 10 ** (Math.floor(Math.log10(absolute)) - count + 1);
  return String(Math.floor(absolute / scale));
}

function truncateToSignificant(value: number, count: number) {
  if (value === 0) return 0;
  const scale = 10 ** (Math.floor(Math.log10(Math.abs(value))) - count + 1);
  return Math.floor(value / scale) * scale;
}

function divisionState(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
  quotientMin = 1,
  quotientMax = 9,
) {
  const divisor = randomInteger(
    context,
    difficultyBand === "L1" ? 20 : difficultyBand === "L2" ? 47 : 101,
    difficultyBand === "L1" ? 99 : difficultyBand === "L2" ? 499 : 999,
  );
  const quotientDigit = randomInteger(context, quotientMin, quotientMax);
  const remainder = randomInteger(context, 1, Math.max(1, divisor - 1));
  const currentDividend = divisor * quotientDigit + remainder;
  return { divisor, quotientDigit, remainder, currentDividend };
}

function directDivisionStepQuestion(
  skillId: Extract<Batch4SkillId, `C-DIV-${string}`>,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (skillId === "C-DIV-05") {
    if (difficultyBand === "L1") {
      const band = choose(context, ["1-9", "10-99", "100-999"] as const);
      const quotient =
        band === "1-9"
          ? randomInteger(context, 2, 9)
          : band === "10-99"
            ? randomInteger(context, 12, 95)
            : randomInteger(context, 120, 700);
      const divisor = randomInteger(context, 20, 99);
      const dividend = divisor * quotient + randomInteger(context, 1, divisor - 1);
      const options = [
        { value: "1-9", label: "1～9" },
        { value: "10-99", label: "10～99" },
        { value: "100-999", label: "100～999" },
      ];
      return question({
        context,
        skillId,
        difficultyBand,
        prompt: `不做完整直除，判断 ${dividend}÷${divisor} 的商在哪个区间：`,
        answer: band,
        data: choiceData({ dividend, divisor }, options),
        primaryStructure: "quotient_magnitude_interval",
        secondarySkillIds: ["A-MAG-01", "A-PLACE-05"],
        inputKind: "choice",
        allowedAnswerSet: [band],
        generatorParams: { dividend, divisor, interval: band },
      });
    }

    if (difficultyBand === "L2") {
      const quotient = randomInteger(context, 12, 98);
      const divisor = randomInteger(context, 31, 199);
      const dividend = divisor * quotient + randomInteger(context, 1, divisor - 1);
      const lower = Math.floor(quotient / 10) * 10;
      const values = [lower - 10, lower, lower + 10].filter((value) => value >= 0);
      const answer = `${lower}-${lower + 9}`;
      const options = shuffle(
        context,
        values.map((value) => ({
          value: `${value}-${value + 9}`,
          label: `${value}～${value + 9}`,
        })),
      );
      return question({
        context,
        skillId,
        difficultyBand,
        prompt: `判断 ${dividend}÷${divisor} 的商落在哪个十位区间：`,
        answer,
        data: choiceData({ dividend, divisor }, options),
        primaryStructure: "quotient_tens_interval",
        secondarySkillIds: ["A-MAG-01"],
        inputKind: "choice",
        allowedAnswerSet: [answer],
        generatorParams: { dividend, divisor, interval: answer },
      });
    }

    const quotientFloor = randomInteger(context, 2, 30);
    const divisor = randomInteger(context, 101, 699);
    const dividend = divisor * quotientFloor + randomInteger(context, 1, divisor - 1);
    const answer = `${quotientFloor}-${quotientFloor + 1}`;
    const options = shuffle(context, [quotientFloor - 1, quotientFloor, quotientFloor + 1].map((value) => ({
      value: `${value}-${value + 1}`,
      label: `${value}～${value + 1}`,
    })));
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `精确到整数区间判断：${dividend}÷${divisor} 位于哪两个相邻整数之间？`,
      answer,
      data: choiceData({ dividend, divisor }, options),
      primaryStructure: "quotient_unit_interval",
      secondarySkillIds: ["A-MAG-01"],
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { dividend, divisor, interval: answer },
    });
  }

  if (skillId === "C-DIV-06") {
    const state = divisionState(difficultyBand, context, 1, 9);
    const options = Array.from({ length: 9 }, (_, index) => ({
      value: String(index + 1),
      label: String(index + 1),
    }));
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `当前被除数 ${state.currentDividend}，除数 ${state.divisor}，这一位试商应取几？`,
      answer: String(state.quotientDigit),
      data: choiceData(state, options),
      primaryStructure: "trial_quotient_digit",
      secondarySkillIds: ["A-MAG-01"],
      inputKind: "choice",
      allowedAnswerSet: [String(state.quotientDigit)],
      generatorParams: state,
    });
  }

  if (skillId === "C-DIV-07") {
    const trueDigit = randomInteger(context, 2, difficultyBand === "L3" ? 7 : 8);
    const overshoot = Math.min(9, trueDigit + (difficultyBand === "L3" ? 2 : 1));
    const divisor = randomInteger(context, 31, difficultyBand === "L1" ? 99 : 499);
    const remainder = randomInteger(context, 0, divisor - 1);
    const currentDividend = divisor * trueDigit + remainder;
    const overshootProduct = divisor * overshoot;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `除数 ${divisor}，当前被除数 ${currentDividend}。试商 ${overshoot} 得 ${overshootProduct}，偏大，应回退到几？`,
      answer: String(trueDigit),
      data: { divisor, currentDividend, trueDigit, overshoot, overshootProduct },
      primaryStructure: difficultyBand === "L3" ? "trial_quotient_over_by_two" : "trial_quotient_over_by_one",
      secondarySkillIds: ["A-MAG-01", "A-SUB-01"],
      inputKind: "number",
      generatorParams: { divisor, currentDividend, trueDigit, overshoot },
    });
  }

  if (skillId === "C-DIV-08") {
    const trueDigit = randomInteger(context, difficultyBand === "L3" ? 3 : 2, 9);
    const gap = difficultyBand === "L3" ? 2 : 1;
    const trialDigit = Math.max(1, trueDigit - gap);
    const divisor = randomInteger(context, 31, difficultyBand === "L1" ? 99 : 499);
    const remainder = randomInteger(context, 0, divisor - 1);
    const currentDividend = divisor * trueDigit + remainder;
    const trialProduct = divisor * trialDigit;
    const remainderAfterTrial = currentDividend - trialProduct;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `除数 ${divisor}，当前被除数 ${currentDividend}。试商 ${trialDigit} 后余 ${remainderAfterTrial}，仍可上调，应调到几？`,
      answer: String(trueDigit),
      data: { divisor, currentDividend, trueDigit, trialDigit, remainderAfterTrial },
      primaryStructure: difficultyBand === "L3" ? "trial_quotient_under_by_two" : "trial_quotient_under_by_one",
      secondarySkillIds: ["A-MAG-01"],
      inputKind: "number",
      generatorParams: { divisor, currentDividend, trueDigit, trialDigit },
    });
  }

  if (skillId === "C-DIV-09") {
    const state = divisionState(difficultyBand, context, 1, 9);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `当前被除数 ${state.currentDividend}，除数 ${state.divisor}，商 ${state.quotientDigit}，余量＝`,
      answer: String(state.remainder),
      data: state,
      primaryStructure: "division_remainder_subtraction",
      secondarySkillIds: ["A-SUB-01", "A-MAG-01"],
      inputKind: "number",
      generatorParams: state,
    });
  }

  if (skillId === "C-DIV-10") {
    const divisor = randomInteger(context, 20, difficultyBand === "L1" ? 99 : 499);
    const remainder = randomInteger(context, 1, divisor - 1);
    const nextDigit = randomInteger(context, 0, 9);
    const nextDividend = remainder * 10 + nextDigit;
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `本步余量 ${remainder}，下一位原始数字是 ${nextDigit}，拼接后的下一被除数＝`,
      answer: String(nextDividend),
      data: { divisor, remainder, nextDigit, nextDividend },
      primaryStructure: nextDigit === 0 ? "bring_down_zero_digit" : "bring_down_next_digit",
      secondarySkillIds: ["A-PLACE-01"],
      inputKind: "number",
      generatorParams: { divisor, remainder, nextDigit },
    });
  }

  if (skillId === "C-DIV-11" || skillId === "C-DIV-12") {
    const divisor = randomInteger(context, difficultyBand === "L1" ? 20 : 73, difficultyBand === "L3" ? 999 : 499);
    const quotientFloor = randomInteger(context, 2, difficultyBand === "L3" ? 300 : 90);
    const remainder = randomInteger(context, 1, divisor - 1);
    const dividend = divisor * quotientFloor + remainder;
    const quotient = dividend / divisor;
    const digitCount = skillId === "C-DIV-11" ? 1 : 2;
    const answer = leadingSignificantDigits(quotient, digitCount);
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `${dividend}÷${divisor}，只填商的前${digitCount === 1 ? "一" : "两"}位有效数字，不四舍五入：`,
      answer,
      data: { dividend, divisor, quotient, digitCount },
      primaryStructure: digitCount === 1 ? "leading_quotient_digit" : "leading_two_quotient_digits",
      secondarySkillIds: ["A-MAG-01"],
      inputKind: "number",
      generatorParams: { dividend, divisor, digitCount },
    });
  }

  const options = [
    { value: "stop", label: "停止" },
    { value: "continue", label: "继续" },
  ];

  if (difficultyBand !== "L3") {
    const requiredDigits = difficultyBand === "L1" ? 1 : 2;
    const completedDigits = context.random() < 0.5 ? requiredDigits : requiredDigits - 1;
    const answer = completedDigits >= requiredDigits ? "stop" : "continue";
    return question({
      context,
      skillId,
      difficultyBand,
      prompt: `目标只需要商的前 ${requiredDigits} 位有效数字；当前已经算出 ${completedDigits} 位。现在应停止还是继续？`,
      answer,
      data: choiceData({ requiredDigits, completedDigits }, options),
      primaryStructure: answer === "stop" ? "division_precision_stop" : "division_precision_continue",
      inputKind: "choice",
      allowedAnswerSet: [answer],
      generatorParams: { requiredDigits, completedDigits, decision: answer },
    });
  }

  const divisor = randomInteger(context, 101, 699);
  const quotientFloor = randomInteger(context, 12, 98);
  const remainder = randomInteger(context, 1, divisor - 1);
  const dividend = divisor * quotientFloor + remainder;
  const quotient = dividend / divisor;
  const completedDigits = context.random() < 0.5 ? 1 : 2;
  const currentApproximation = truncateToSignificant(quotient, completedDigits);
  const remainingAmount = dividend - currentApproximation * divisor;
  const relativeError = Math.abs(currentApproximation - quotient) / quotient;
  const answer = relativeError <= 0.03 ? "stop" : "continue";
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${dividend}÷${divisor} 当前粗商约 ${cleanNumber(currentApproximation, 2)}，尚余约 ${cleanNumber(remainingAmount, 1)}；目标相对误差≤3%，应停止还是继续下一位？`,
    answer,
    data: choiceData(
      {
        dividend,
        divisor,
        quotient,
        currentApproximation,
        relativeError,
        completedDigits,
      },
      options,
    ),
    primaryStructure: answer === "stop" ? "division_error_budget_stop" : "division_error_budget_continue",
    secondarySkillIds: ["B-APP-04"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    targetPrecision: "3%",
    generatorParams: {
      dividend,
      divisor,
      currentApproximation,
      relativeError,
      completedDigits,
      decision: answer,
    },
  });
}

export function generateBatch4SkillQuestion(
  skillId: Batch4SkillId,
  difficultyBand: DifficultyBand,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (skillId === "B-BASE-01" || skillId === "B-BASE-02" || skillId === "B-BASE-03")
    return nearestAnchorQuestion(skillId, difficultyBand, context);
  if (skillId === "B-BASE-04") return percentAnchorQuestion(difficultyBand, context);
  if (skillId === "B-BASE-05") return reciprocalAnchorQuestion(difficultyBand, context);
  if (skillId === "B-PSPLIT-01" || skillId === "B-PSPLIT-02")
    return percentSplitQuestion(skillId, difficultyBand, context);
  if (skillId.startsWith("B-RMUL-"))
    return rMultiplyQuestion(
      skillId as Extract<Batch4SkillId, `B-RMUL-${string}`>,
      difficultyBand,
      context,
    );
  if (skillId.startsWith("B-R-"))
    return rQuestion(
      skillId as Extract<Batch4SkillId, `B-R-${string}`>,
      difficultyBand,
      context,
    );
  if (skillId.startsWith("B-APP-"))
    return approximationQuestion(
      skillId as Extract<Batch4SkillId, `B-APP-${string}`>,
      difficultyBand,
      context,
    );
  return directDivisionStepQuestion(
    skillId as Extract<Batch4SkillId, `C-DIV-${string}`>,
    difficultyBand,
    context,
  );
}

export function generateBatch4SkillSet(
  skillId: Batch4SkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    generateBatch4SkillQuestion(skillId, difficultyBand, context),
  );
}

export function gradeBatch4SkillQuestion(
  questionToGrade: GeneratedQuestion,
  input: string,
) {
  if (questionToGrade.type !== "skill_drill" || !isBatch4SkillId(questionToGrade.skillId))
    throw new Error("Only implemented batch-4 skill drills can use this grader.");

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

  if (questionToGrade.inputKind === "percent_blocks") {
    const selected = normalizedInput
      .split(",")
      .filter(Boolean)
      .map(Number);
    const target = Number(questionToGrade.data.targetPercent);
    const valid =
      selected.length > 0 &&
      selected.length <= 3 &&
      selected.every(Number.isFinite) &&
      Number.isFinite(target) &&
      Math.abs(selected.reduce((sum, value) => sum + value, 0) - target) <= 1e-9;
    return {
      isCorrect: valid,
      accuracyLevel: valid ? ("exact" as const) : ("wrong" as const),
    };
  }

  const actual = Number(normalizedInput.replace("%", ""));
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
