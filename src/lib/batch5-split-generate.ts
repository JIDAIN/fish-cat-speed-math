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

export const BATCH5_SPLIT_GENERATOR_VERSION = "stage4-batch5-1.0.0";

export const batch5SplitSkillIds = [
  "B-FPSPLIT-01",
  "B-FPSPLIT-02",
  "B-FPSPLIT-03",
  "B-FPSPLIT-04",
  "B-FPSPLIT-05",
  "B-FPSPLIT-06",
  "B-FPSPLIT-07",
  "B-FPSPLIT-08",
  "B-FPSPLIT-09",
  "B-FPSPLIT-10",
  "B-FPSPLIT-11",
  "C-DIVSPLIT-01",
  "C-DIVSPLIT-02",
  "C-DIVSPLIT-03",
  "C-DIVSPLIT-04",
  "C-DIVSPLIT-05",
  "C-DIVSPLIT-06",
  "C-DIVSPLIT-07",
  "C-DIVSPLIT-08",
  "C-DIVSPLIT-09",
  "C-DIVSPLIT-10",
  "C-DIVSPLIT-11",
] as const satisfies readonly SkillId[];

export type Batch5SplitSkillId = (typeof batch5SplitSkillIds)[number];

const batch5SkillSet = new Set<string>(batch5SplitSkillIds);

export function isBatch5SplitSkillId(value: unknown): value is Batch5SplitSkillId {
  return typeof value === "string" && batch5SkillSet.has(value);
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
  skillId: Batch5SplitSkillId;
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
      tags: ["除法拆分", ...structureTags],
    },
    primaryStructure: input.primaryStructure,
    secondaryTags: input.secondaryTags ?? [],
    generationRuleVersion: BATCH5_SPLIT_GENERATOR_VERSION,
    skillId: input.skillId,
    secondarySkillIds: input.secondarySkillIds ?? [],
    difficultyBand: input.difficultyBand,
    structureTags,
    targetPrecision: input.targetPrecision ?? "exact",
    generatorParams: {
      generatorFamily:
        definition.layer === "B" ? "fraction_percent_split_component" : "division_split_flow",
      implementationBatch: "stage4_batch5",
      ...(input.generatorParams ?? {}),
    },
    allowedAnswerSet: input.allowedAnswerSet,
    masteryProfile: definition.masteryProfile,
    inputKind,
    stepSpecs: input.stepSpecs,
  };
}

const blockBySkill: Readonly<
  Record<
    Extract<Batch5SplitSkillId, `B-FPSPLIT-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`>,
    { percent: number; support?: SkillId }
  >
> = {
  "B-FPSPLIT-01": { percent: 100 },
  "B-FPSPLIT-02": { percent: 50, support: "A-PCT-12" },
  "B-FPSPLIT-03": { percent: 25, support: "A-PCT-10" },
  "B-FPSPLIT-04": { percent: 20, support: "A-PCT-09" },
  "B-FPSPLIT-05": { percent: 10, support: "A-PCT-07" },
  "B-FPSPLIT-06": { percent: 5, support: "A-PCT-06" },
  "B-FPSPLIT-07": { percent: 1, support: "A-PCT-02" },
  "B-FPSPLIT-08": { percent: 0.1, support: "A-PCT-01" },
};

function denominatorForBlock(
  percent: number,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  if (percent === 0.1) return randomInteger(context, 1, 5) * 1000;
  const multiplierMax = difficultyBand === "L1" ? 20 : difficultyBand === "L2" ? 35 : 50;
  return randomInteger(context, 2, multiplierMax) * 100;
}

function fixedBlockComponentQuestion(
  skillId: keyof typeof blockBySkill,
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const { percent, support } = blockBySkill[skillId];
  const denominator = denominatorForBlock(percent, difficultyBand, context);
  const blockAmount = (denominator * percent) / 100;
  const remainderPercent =
    difficultyBand === "L1"
      ? choose(context, [0, 1, 2] as const)
      : difficultyBand === "L2"
        ? choose(context, [1, 2, 5] as const)
        : choose(context, [0.1, 1, 2, 5, 8] as const);
  const numerator = blockAmount + (denominator * remainderPercent) / 100;
  return question({
    context,
    skillId,
    difficultyBand,
    prompt: `${cleanNumber(numerator, 2)}/${denominator} 若先拆 ${cleanNumber(percent, 1)}%，这一主块对应的分子量是多少？`,
    answer: cleanNumber(blockAmount, 4),
    data: { numerator, denominator, percentBlock: percent, blockAmount, remainderPercent },
    primaryStructure: `fraction_split_${cleanNumber(percent, 1)}pct_block`,
    secondarySkillIds: support ? [support] : ["A-MAG-02"],
    inputKind: "number",
    generatorParams: { numerator, denominator, percentBlock: percent, remainderPercent },
  });
}

const multiBlockTemplates: Record<DifficultyBand, readonly number[][]> = {
  L1: [
    [25, 10],
    [20, 10],
    [50, 5],
  ],
  L2: [
    [25, 10, 2],
    [20, 10, 5],
    [50, 5, 1],
  ],
  L3: [
    [25, 10, 2, 0.1],
    [20, 10, 5, 1],
    [50, 10, 2, 0.1],
  ],
};

function multiBlockComponentQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const blocks = choose(context, multiBlockTemplates[difficultyBand]);
  const denominator = randomInteger(context, 2, difficultyBand === "L3" ? 40 : 25) * 100;
  const targetPercent = blocks.reduce((sum, value) => sum + value, 0);
  const numerator = (denominator * targetPercent) / 100;
  return question({
    context,
    skillId: "B-FPSPLIT-09",
    difficultyBand,
    prompt: `${cleanNumber(numerator, 2)}/${denominator} 可由哪些基础百分比块拼出？按从大到小选择。`,
    answer: blocks.join(","),
    data: { numerator, denominator, targetPercent, canonicalBlocks: blocks },
    primaryStructure: "fraction_multi_percent_blocks",
    secondarySkillIds: ["B-PSPLIT-01"],
    inputKind: "percent_blocks",
    allowedAnswerSet: [blocks.join(",")],
    generatorParams: { numerator, denominator, targetPercent, blockCount: blocks.length },
  });
}

function reverseComponentQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const anchor = difficultyBand === "L1" ? 100 : choose(context, [100, 50] as const);
  const gap = choose(
    context,
    difficultyBand === "L1"
      ? [5, 10]
      : difficultyBand === "L2"
        ? [2, 5, 10]
        : [1, 2, 5, 10],
  );
  const targetPercent = anchor - gap;
  const denominator = randomInteger(context, 2, 30) * 100;
  const numerator = (denominator * targetPercent) / 100;
  const answer = `${anchor}-${gap}`;
  const options = shuffle(context, [
    { value: answer, label: `${anchor}% - ${gap}%` },
    { value: `${gap}+${targetPercent}`, label: `${gap}% + ${targetPercent}%` },
    { value: `${anchor}+${gap}`, label: `${anchor}% + ${gap}%` },
  ]);
  return question({
    context,
    skillId: "B-FPSPLIT-10",
    difficultyBand,
    prompt: `${cleanNumber(numerator, 2)}/${denominator} 靠近 ${anchor}%，选择最低成本的反向拆分表达：`,
    answer,
    data: choiceData({ numerator, denominator, anchorPercent: anchor, gapPercent: gap, targetPercent }, options),
    primaryStructure: "reverse_fraction_percent_split",
    secondarySkillIds: ["B-BASE-04"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { numerator, denominator, anchorPercent: anchor, gapPercent: gap },
  });
}

function lowestCostComponentQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const templates =
    difficultyBand === "L1"
      ? [
          { target: 37, best: "25,10,2", alternatives: ["25,10,2", "20,10,5,2", "10,10,10,5,2"] },
          { target: 55, best: "50,5", alternatives: ["50,5", "25,20,10", "20,20,10,5"] },
        ]
      : difficultyBand === "L2"
        ? [
            { target: 27, best: "25,2", alternatives: ["25,2", "20,5,2", "10,10,5,2"] },
            { target: 61, best: "50,10,1", alternatives: ["50,10,1", "25,25,10,1", "20,20,20,1"] },
          ]
        : [
            { target: 37.1, best: "25,10,2,0.1", alternatives: ["25,10,2,0.1", "20,10,5,2,0.1", "10,10,10,5,2,0.1"] },
            { target: 51, best: "50,1", alternatives: ["50,1", "25,25,1", "20,20,10,1"] },
          ];
  const template = choose(context, templates);
  const denominator = randomInteger(context, 2, 20) * 100;
  const numerator = (denominator * template.target) / 100;
  const options = shuffle(
    context,
    template.alternatives.map((path) => ({
      value: path,
      label: path.split(",").map((part) => `${part}%`).join(" + "),
    })),
  );
  return question({
    context,
    skillId: "B-FPSPLIT-11",
    difficultyBand,
    prompt: `${cleanNumber(numerator, 2)}/${denominator} 有多条拆分路径，选择块数和计算成本最低的一条：`,
    answer: template.best,
    data: choiceData({ numerator, denominator, targetPercent: template.target }, options),
    primaryStructure: "lowest_cost_fraction_split_path",
    secondarySkillIds: ["B-BASE-04", "B-PSPLIT-02"],
    inputKind: "choice",
    allowedAnswerSet: [template.best],
    generatorParams: { numerator, denominator, targetPercent: template.target, bestPath: template.best },
  });
}

type SplitScenario = {
  numerator: number;
  denominator: number;
  blocks: number[];
  amounts: number[];
  targetPercent: number;
};

function splitScenario(difficultyBand: DifficultyBand, context: GenerationContext): SplitScenario {
  const templates: Record<DifficultyBand, readonly number[][]> = {
    L1: [
      [25, 10],
      [50, 5],
      [20, 10],
    ],
    L2: [
      [25, 10, 2],
      [50, 5, 1],
      [20, 10, 5],
    ],
    L3: [
      [25, 10, 2],
      [50, 10, 1],
      [20, 10, 5],
    ],
  };
  const blocks = [...choose(context, templates[difficultyBand])];
  const denominator = randomInteger(context, 2, difficultyBand === "L3" ? 35 : 20) * 100;
  const amounts = blocks.map((block) => (denominator * block) / 100);
  const numerator = amounts.reduce((sum, value) => sum + value, 0);
  return {
    numerator,
    denominator,
    blocks,
    amounts,
    targetPercent: blocks.reduce((sum, value) => sum + value, 0),
  };
}

const splitBlockChoices = (values: readonly number[]) =>
  values.map((value) => ({ value: cleanNumber(value, 1), label: `${cleanNumber(value, 1)}%` }));

function applicabilityQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const classRoll = context.random();
  const kind = classRoll < 0.45 ? "suitable" : classRoll < 0.7 ? "borderline" : "unsuitable";
  const base = splitScenario(difficultyBand, context);
  const scenario =
    kind === "suitable"
      ? base
      : kind === "borderline"
        ? { ...base, numerator: base.numerator + base.denominator * 0.0037 }
        : { ...base, numerator: base.denominator * 0.437 };
  const options = [
    { value: "suitable", label: "适合拆分" },
    { value: "borderline", label: "勉强，可比较其他路径" },
    { value: "unsuitable", label: "明显不适合拆分" },
  ];
  return question({
    context,
    skillId: "C-DIVSPLIT-01",
    difficultyBand,
    prompt: `只看数字结构，判断 ${cleanNumber(scenario.numerator, 2)}÷${scenario.denominator} 是否适合走除法拆分：`,
    answer: kind,
    data: choiceData(
      { numerator: scenario.numerator, denominator: scenario.denominator, classification: kind },
      options,
    ),
    primaryStructure: `division_split_${kind}`,
    secondarySkillIds: ["B-FPSPLIT-11", "B-BASE-04"],
    inputKind: "choice",
    allowedAnswerSet: [kind],
    generatorParams: { numerator: scenario.numerator, denominator: scenario.denominator, classification: kind },
  });
}

function firstBlockQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = splitScenario(difficultyBand, context);
  const answer = cleanNumber(scenario.blocks[0], 1);
  const candidates = Array.from(new Set([scenario.blocks[0], 50, 25, 20, 10]))
    .slice(0, 5);
  const options = shuffle(context, splitBlockChoices(candidates));
  return question({
    context,
    skillId: "C-DIVSPLIT-02",
    difficultyBand,
    prompt: `${cleanNumber(scenario.numerator, 2)}÷${scenario.denominator}，第一主块选哪个最省？`,
    answer,
    data: choiceData({ numerator: scenario.numerator, denominator: scenario.denominator, targetPercent: scenario.targetPercent }, options),
    primaryStructure: "division_split_first_block_choice",
    secondarySkillIds: ["B-FPSPLIT-11"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { numerator: scenario.numerator, denominator: scenario.denominator, firstBlock: scenario.blocks[0] },
  });
}

function mainBlockAmountQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = splitScenario(difficultyBand, context);
  const percent = scenario.blocks[0];
  const amount = scenario.amounts[0];
  return question({
    context,
    skillId: "C-DIVSPLIT-03",
    difficultyBand,
    prompt: `除数 ${scenario.denominator}，已选主块 ${cleanNumber(percent, 1)}%，对应量＝`,
    answer: cleanNumber(amount, 4),
    data: { denominator: scenario.denominator, percentBlock: percent, blockAmount: amount },
    primaryStructure: "division_split_primary_amount",
    secondarySkillIds: ["A-PCT-07", "A-PCT-10"],
    inputKind: "number",
    generatorParams: { denominator: scenario.denominator, percentBlock: percent },
  });
}

function remainderQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = splitScenario(difficultyBand, context);
  const firstAmount = scenario.amounts[0];
  const remainder = scenario.numerator - firstAmount;
  return question({
    context,
    skillId: "C-DIVSPLIT-04",
    difficultyBand,
    prompt: `分子 ${cleanNumber(scenario.numerator, 2)}，已拆出 ${cleanNumber(firstAmount, 2)}，剩余量＝`,
    answer: cleanNumber(remainder, 4),
    data: { numerator: scenario.numerator, primaryAmount: firstAmount, remainder },
    primaryStructure: "division_split_remainder",
    secondarySkillIds: ["A-SUB-01", "A-SUB-02"],
    inputKind: "number",
    generatorParams: { numerator: scenario.numerator, primaryAmount: firstAmount },
  });
}

function nextBlockQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = splitScenario(difficultyBand, context);
  const firstAmount = scenario.amounts[0];
  const remainder = scenario.numerator - firstAmount;
  const answer = cleanNumber(scenario.blocks[1], 1);
  const candidates = Array.from(new Set([scenario.blocks[1], 10, 5, 2, 1, 0.1])).slice(0, 5);
  const options = shuffle(context, splitBlockChoices(candidates));
  return question({
    context,
    skillId: "C-DIVSPLIT-05",
    difficultyBand,
    prompt: `除数 ${scenario.denominator}，当前剩余量 ${cleanNumber(remainder, 2)}，下一块优先选哪个？`,
    answer,
    data: choiceData({ denominator: scenario.denominator, remainder }, options),
    primaryStructure: "division_split_next_block",
    secondarySkillIds: ["B-FPSPLIT-05", "B-FPSPLIT-06", "B-FPSPLIT-07"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { denominator: scenario.denominator, remainder, nextBlock: scenario.blocks[1] },
  });
}

function tailQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const denominator = randomInteger(context, 1, 5) * 1000;
  const tailPercent = choose(
    context,
    difficultyBand === "L1"
      ? [1, 2]
      : difficultyBand === "L2"
        ? [0.5, 1, 1.5, 2]
        : [0.1, 0.7, 1.1, 1.3, 1.9],
  );
  const remainder = (denominator * tailPercent) / 100;
  const tolerance = difficultyBand === "L3" ? 0.1 : 0.05;
  return question({
    context,
    skillId: "C-DIVSPLIT-06",
    difficultyBand,
    prompt: `除数 ${denominator}，尾部剩余 ${cleanNumber(remainder, 2)}，约等于多少 %？（只填数字）`,
    answer: cleanNumber(tailPercent, 2),
    acceptedRange: acceptedAround(tailPercent, tolerance),
    data: { denominator, remainder, tailPercent },
    primaryStructure: "division_split_tail_one_percent",
    secondarySkillIds: ["A-PCT-01", "A-PCT-02", "B-FPSPLIT-07", "B-FPSPLIT-08"],
    inputKind: "number",
    targetPrecision: "range",
    generatorParams: { denominator, remainder, tailPercent, tolerancePercentPoints: tolerance },
  });
}

function accumulateQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const blocks = choose(context, multiBlockTemplates[difficultyBand]);
  const total = blocks.reduce((sum, value) => sum + value, 0);
  return question({
    context,
    skillId: "C-DIVSPLIT-07",
    difficultyBand,
    prompt: `已依次拆出 ${blocks.map((value) => `${cleanNumber(value, 1)}%`).join(" + ")}，累计百分比＝`,
    answer: cleanNumber(total, 2),
    data: { blocks, totalPercent: total },
    primaryStructure: "division_split_accumulate_percent",
    secondarySkillIds: ["B-PSPLIT-01"],
    inputKind: "number",
    generatorParams: { blocks, totalPercent: total },
  });
}

function reverseSplitQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const anchor = difficultyBand === "L1" ? 100 : choose(context, [100, 50] as const);
  const gap = choose(context, difficultyBand === "L3" ? [1, 2, 5, 10] : [2, 5, 10]);
  const targetPercent = anchor - gap;
  const denominator = randomInteger(context, 2, 30) * 100;
  const numerator = (denominator * targetPercent) / 100;
  return question({
    context,
    skillId: "C-DIVSPLIT-08",
    difficultyBand,
    prompt: `${cleanNumber(numerator, 2)}÷${denominator} 靠近 ${anchor}%，用反向拆分得到最终百分比（只填数字）：`,
    answer: cleanNumber(targetPercent, 2),
    data: { numerator, denominator, anchorPercent: anchor, gapPercent: gap, targetPercent },
    primaryStructure: "division_split_reverse",
    secondarySkillIds: ["B-FPSPLIT-10"],
    inputKind: "number",
    generatorParams: { numerator, denominator, anchorPercent: anchor, gapPercent: gap },
  });
}

function continueOrExitQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const continueCase = context.random() < 0.55;
  const denominator = continueCase ? 800 : 913;
  const remainder = continueCase
    ? choose(context, [80, 40, 16, 8] as const)
    : choose(context, difficultyBand === "L3" ? [37, 53, 71] : [37, 53]);
  const answer = continueCase ? "continue" : "exit";
  const options = [
    { value: "continue", label: "继续拆分" },
    { value: "exit", label: "退出拆分，换其他路径" },
  ];
  return question({
    context,
    skillId: "C-DIVSPLIT-09",
    difficultyBand,
    prompt: `当前除数 ${denominator}、剩余量 ${remainder}。继续用常用百分比块是否仍划算？`,
    answer,
    data: choiceData({ denominator, remainder, decision: answer }, options),
    primaryStructure: continueCase ? "division_split_continue" : "division_split_exit",
    secondarySkillIds: ["B-FPSPLIT-11", "B-APP-05"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    generatorParams: { denominator, remainder, decision: answer },
  });
}

function precisionStopQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const stopCase = context.random() < 0.5;
  const truePercent = stopCase ? 37 : 40;
  const cumulativePercent = stopCase ? 36 : 35;
  const relativeError = Math.abs(truePercent - cumulativePercent) / truePercent;
  const targetRatio = difficultyBand === "L1" ? 0.05 : 0.03;
  const answer = relativeError <= targetRatio ? "stop" : "continue";
  const options = [
    { value: "stop", label: "精度够了，停止" },
    { value: "continue", label: "还不够，继续" },
  ];
  return question({
    context,
    skillId: "C-DIVSPLIT-10",
    difficultyBand,
    prompt: `当前累计 ${cumulativePercent}%，剩余最多约 ${truePercent - cumulativePercent} 个百分点；目标相对误差≤${cleanNumber(targetRatio * 100, 0)}%，应停止还是继续？`,
    answer,
    data: choiceData({ truePercent, cumulativePercent, relativeError, targetRatio }, options),
    primaryStructure: answer === "stop" ? "division_split_precision_stop" : "division_split_precision_continue",
    secondarySkillIds: ["C-EST-10", "C-EST-11"],
    inputKind: "choice",
    allowedAnswerSet: [answer],
    targetPrecision: targetRatio === 0.05 ? "5%" : "3%",
    generatorParams: { truePercent, cumulativePercent, relativeError, targetRatio, decision: answer },
  });
}

function flowChoice(id: string, stepSkillId: SkillId, prompt: string, expectedValue: string, choices: QuestionStepChoice[]): QuestionStepSpec {
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

function flowNumber(id: string, stepSkillId: SkillId, prompt: string, expectedValue: number, targetPrecision: TargetPrecision = "exact", tolerance = 0): QuestionStepSpec {
  return {
    id,
    stepSkillId,
    stepType: "calculation",
    prompt,
    inputKind: "number",
    expectedValue: cleanNumber(expectedValue, 4),
    targetPrecision,
    acceptedRange: tolerance > 0 ? acceptedAround(expectedValue, tolerance) : undefined,
  };
}

function fullSplitFlowQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
) {
  const scenario = splitScenario(difficultyBand, context);
  const [firstBlock, secondBlock, thirdBlock] = scenario.blocks;
  const firstAmount = scenario.amounts[0];
  const remainder1 = scenario.numerator - firstAmount;
  const secondAmount = scenario.amounts[1];
  const remainder2 = remainder1 - secondAmount;
  const firstChoices = shuffle(context, splitBlockChoices(Array.from(new Set([firstBlock, 50, 25, 20, 10])).slice(0, 5)));
  const nextChoices = shuffle(context, splitBlockChoices(Array.from(new Set([secondBlock, 10, 5, 2, 1, 0.1])).slice(0, 5)));
  const steps: QuestionStepSpec[] = [
    flowChoice(
      "split-applicable",
      "C-DIVSPLIT-01",
      "这组数字适合继续用除法拆分吗？",
      "suitable",
      [
        { value: "suitable", label: "适合拆分" },
        { value: "unsuitable", label: "不适合" },
      ],
    ),
    flowChoice(
      "split-first-block",
      "C-DIVSPLIT-02",
      "选择第一主百分比块：",
      cleanNumber(firstBlock, 1),
      firstChoices,
    ),
    flowNumber(
      "split-primary-amount",
      "C-DIVSPLIT-03",
      `${cleanNumber(firstBlock, 1)}% 对应的分子量是多少？`,
      firstAmount,
    ),
    flowNumber(
      "split-remainder-1",
      "C-DIVSPLIT-04",
      "拆完第一主块后，剩余分子量是多少？",
      remainder1,
    ),
    flowChoice(
      "split-continue",
      "C-DIVSPLIT-09",
      "当前剩余量仍能用低成本百分比块处理，继续还是退出？",
      "continue",
      [
        { value: "continue", label: "继续拆分" },
        { value: "exit", label: "退出拆分" },
      ],
    ),
    flowChoice(
      "split-next-block",
      "C-DIVSPLIT-05",
      "选择下一百分比块：",
      cleanNumber(secondBlock, 1),
      nextChoices,
    ),
    flowNumber(
      "split-remainder-2",
      "C-DIVSPLIT-04",
      `再拆 ${cleanNumber(secondBlock, 1)}% 后，剩余分子量是多少？`,
      remainder2,
    ),
  ];

  if (thirdBlock !== undefined) {
    const tailSkill: SkillId = thirdBlock <= 1 ? "C-DIVSPLIT-06" : "C-DIVSPLIT-05";
    steps.push(
      flowChoice(
        "split-tail-block",
        tailSkill,
        "最后的剩余量最适合对应哪个百分比块？",
        cleanNumber(thirdBlock, 1),
        shuffle(context, splitBlockChoices(Array.from(new Set([thirdBlock, 5, 2, 1, 0.1])).slice(0, 5))),
      ),
    );
  }

  steps.push(
    flowNumber(
      "split-accumulate",
      "C-DIVSPLIT-07",
      "把已经使用的百分比块累计起来，当前百分比是多少？",
      scenario.targetPercent,
    ),
    flowChoice(
      "split-precision-stop",
      "C-DIVSPLIT-10",
      "当前已得到精确结果，是否应该停止？",
      "stop",
      [
        { value: "stop", label: "停止" },
        { value: "continue", label: "继续算更多尾数" },
      ],
    ),
    flowNumber(
      "split-final",
      "C-DIVSPLIT-11",
      "最终百分比 / 商近似是多少？（只填百分数数字）",
      scenario.targetPercent,
    ),
  );

  return question({
    context,
    skillId: "C-DIVSPLIT-11",
    difficultyBand,
    prompt: `完整除法拆分：${cleanNumber(scenario.numerator, 2)}÷${scenario.denominator}`,
    answer: cleanNumber(scenario.targetPercent, 2),
    data: {
      numerator: scenario.numerator,
      denominator: scenario.denominator,
      targetPercent: scenario.targetPercent,
      canonicalBlocks: scenario.blocks,
    },
    primaryStructure: "division_split_full_flow",
    secondarySkillIds: [
      "B-FPSPLIT-11",
      "B-PSPLIT-01",
      "A-SUB-01",
      "A-PCT-02",
    ],
    inputKind: "steps",
    stepSpecs: steps,
    targetPrecision: "exact",
    generatorParams: {
      numerator: scenario.numerator,
      denominator: scenario.denominator,
      targetPercent: scenario.targetPercent,
      blockCount: scenario.blocks.length,
      canonicalBlocks: scenario.blocks,
    },
  });
}

export function generateBatch5SplitQuestion(
  skillId: Batch5SplitSkillId,
  difficultyBand: DifficultyBand,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion {
  if (skillId in blockBySkill)
    return fixedBlockComponentQuestion(
      skillId as keyof typeof blockBySkill,
      difficultyBand,
      context,
    );
  if (skillId === "B-FPSPLIT-09") return multiBlockComponentQuestion(difficultyBand, context);
  if (skillId === "B-FPSPLIT-10") return reverseComponentQuestion(difficultyBand, context);
  if (skillId === "B-FPSPLIT-11") return lowestCostComponentQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-01") return applicabilityQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-02") return firstBlockQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-03") return mainBlockAmountQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-04") return remainderQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-05") return nextBlockQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-06") return tailQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-07") return accumulateQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-08") return reverseSplitQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-09") return continueOrExitQuestion(difficultyBand, context);
  if (skillId === "C-DIVSPLIT-10") return precisionStopQuestion(difficultyBand, context);
  return fullSplitFlowQuestion(difficultyBand, context);
}

export function generateBatch5SplitSet(
  skillId: Batch5SplitSkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    generateBatch5SplitQuestion(skillId, difficultyBand, context),
  );
}

export function gradeBatch5SplitQuestion(
  questionToGrade: GeneratedQuestion,
  input: string,
) {
  if (
    questionToGrade.type !== "skill_drill" ||
    !isBatch5SplitSkillId(questionToGrade.skillId)
  )
    throw new Error("Only implemented batch-5 split drills can use this grader.");

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
      selected.length <= 4 &&
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
  if (Math.abs(actual - expected) <= epsilon)
    return { isCorrect: true, accuracyLevel: "exact" as const };
  const range = questionToGrade.acceptedRange;
  const accepted = range !== undefined && actual >= range.min && actual <= range.max;
  return {
    isCorrect: accepted,
    accuracyLevel: accepted ? ("accepted" as const) : ("wrong" as const),
  };
}
