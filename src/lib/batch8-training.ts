import {
  generateSkillDrillSet,
  ImplementedSkillId,
  isImplementedSkillId,
} from "./implemented-skill-drills";
import { GenerationContext, productionGenerationContext } from "./generate";
import {
  DifficultyBand,
  GeneratedQuestion,
  QuestionStepSpec,
  SkillId,
  TrainingSession,
} from "./types";

export const BATCH8_TRAINING_VERSION = "stage4-batch8-1.0.0";

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

const mixedFlowPrefixes = [
  "C-DIVSPLIT-",
  "C-DIVSCALE-",
  "C-XP-SCALE-",
] as const;

/**
 * Mixed V1 intentionally uses already-learned single-question skills only.
 * Full flow skills stay in their dedicated screens so a mixed session cannot
 * silently lose per-step timing when it alternates between ordinary and flow
 * questions.
 */
function canEnterMixedV1(skillId: SkillId): skillId is ImplementedSkillId {
  return (
    isImplementedSkillId(skillId) &&
    !mixedFlowPrefixes.some((prefix) => skillId.startsWith(prefix))
  );
}

export function generateMixedSkillSet(
  learnedSkillIds: readonly SkillId[],
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  const eligible = Array.from(new Set(learnedSkillIds.filter(canEnterMixedV1)));
  if (eligible.length < 2)
    throw new Error("混合训练至少需要先完成2个可混合的纯计算专项。先做两个专项，再回来开启混合训练。");

  // Keep one mixed run focused enough to diagnose. Ten or twenty questions
  // spread over at most five learned skills gives repeated observations rather
  // than one isolated sample per capability.
  const selected = shuffle(context, eligible).slice(0, Math.min(5, eligible.length));
  const questions: GeneratedQuestion[] = [];
  for (let index = 0; index < count; index += 1) {
    const skillId = selected[index % selected.length];
    const generated = generateSkillDrillSet(
      skillId,
      difficultyBand,
      1,
      context,
    )[0];
    questions.push({
      ...generated,
      structureTags: Array.from(
        new Set([...(generated.structureTags ?? []), "mixed_training"]),
      ),
      generatorParams: {
        ...(generated.generatorParams ?? {}),
        mixedTrainingVersion: BATCH8_TRAINING_VERSION,
        mixedSkillCount: selected.length,
      },
    });
  }
  return questions;
}

const denominatorScenarios: ReadonlyArray<{
  denominator: number;
  base: number;
}> = [
  { denominator: 122, base: 125 },
  { denominator: 128, base: 125 },
  { denominator: 196, base: 200 },
  { denominator: 204, base: 200 },
  { denominator: 242, base: 250 },
  { denominator: 258, base: 250 },
  { denominator: 312, base: 300 },
  { denominator: 326, base: 333 },
  { denominator: 392, base: 400 },
  { denominator: 408, base: 400 },
  { denominator: 488, base: 500 },
  { denominator: 512, base: 500 },
] as const;

const q0ByBand: Readonly<Record<DifficultyBand, readonly number[]>> = {
  L1: [2, 4, 5, 8, 10],
  L2: [2.5, 4, 5, 8, 12.5, 20],
  L3: [1.5, 2.5, 4.5, 8, 12.5, 25],
};

function acceptedAround(value: number, ratio: number) {
  const tolerance = Math.max(0.01, Math.abs(value) * ratio);
  const epsilon = Number.EPSILON * Math.max(1, Math.abs(value));
  return {
    min: value - tolerance - epsilon,
    max: value + tolerance + epsilon,
  };
}

function cleanNumber(value: number, decimals = 4) {
  return String(Number(value.toFixed(decimals)));
}

function pathComparisonQuestion(
  difficultyBand: DifficultyBand,
  context: GenerationContext,
): GeneratedQuestion {
  const scenario = choose(context, denominatorScenarios);
  const q0 = choose(context, q0ByBand[difficultyBand]);
  const numerator = scenario.base * q0;
  const exact = numerator / scenario.denominator;
  const range = acceptedAround(exact, 0.03);
  const expected = cleanNumber(exact, 3);
  const choices = [
    { value: "direct", label: "直除" },
    { value: "split", label: "除法拆分 / 包子法" },
    { value: "scale", label: "除法补偿放缩" },
  ];
  const steps: QuestionStepSpec[] = [
    {
      id: "route_direct",
      stepSkillId: "C-DIV-04",
      stepType: "path_direct",
      prompt: `同题 ${cleanNumber(numerator)}÷${scenario.denominator}：这一遍只用直除，给出相对误差≤3%的商。`,
      inputKind: "number",
      expectedValue: expected,
      acceptedRange: range,
      targetPrecision: "3%",
    },
    {
      id: "route_split",
      stepSkillId: "C-DIVSPLIT-11",
      stepType: "path_split",
      prompt: `还是 ${cleanNumber(numerator)}÷${scenario.denominator}：这一遍只用除法拆分 / 包子法，给出相对误差≤3%的商。`,
      inputKind: "number",
      expectedValue: expected,
      acceptedRange: range,
      targetPrecision: "3%",
    },
    {
      id: "route_scale",
      stepSkillId: "C-DIVSCALE-12",
      stepType: "path_scale",
      prompt: `还是 ${cleanNumber(numerator)}÷${scenario.denominator}：这一遍只用除法补偿放缩，给出相对误差≤3%的商。附近基准 B=${scenario.base}。`,
      inputKind: "number",
      expectedValue: expected,
      acceptedRange: range,
      targetPrecision: "3%",
    },
    {
      id: "route_preference",
      stepType: "path_preference",
      prompt: "三条路径都做完后，选你这题主观上最愿意在实战里使用的一条。这里不预设唯一正确方法。",
      inputKind: "choice",
      expectedValue: "direct",
      allowedAnswerSet: ["direct", "split", "scale"],
      choices,
    },
  ];

  return {
    id: context.createId(),
    type: "skill_drill",
    subtype: `path_compare:${difficultyBand}`,
    prompt: `同题路径对比：${cleanNumber(numerator)}÷${scenario.denominator}`,
    answer: expected,
    acceptedRange: range,
    data: {
      numerator,
      denominator: scenario.denominator,
      denominatorBase: scenario.base,
      exactQuotient: exact,
      q0,
    },
    difficulty: {
      level: difficultyBand === "L1" ? 2 : difficultyBand === "L2" ? 3 : 5,
      tags: ["同题路径对比", difficultyBand.toLowerCase()],
    },
    primaryStructure: "division_same_question_path_compare",
    secondaryTags: ["direct_vs_split_vs_scale"],
    generationRuleVersion: BATCH8_TRAINING_VERSION,
    secondarySkillIds: ["C-DIV-04", "C-DIVSPLIT-11", "C-DIVSCALE-12"],
    difficultyBand,
    structureTags: ["path_compare", "direct", "split", "scale"],
    targetPrecision: "3%",
    generatorParams: {
      generatorFamily: "same_question_path_compare",
      implementationBatch: "stage4_batch8",
      numerator,
      denominator: scenario.denominator,
      denominatorBase: scenario.base,
      exactQuotient: exact,
    },
    inputKind: "steps",
    stepSpecs: steps,
  };
}

export function generatePathComparisonSet(
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");
  return Array.from({ length: count }, () =>
    pathComparisonQuestion(difficultyBand, context),
  );
}

export type PathRouteKey = "direct" | "split" | "scale";

export type PathRouteSummary = {
  route: PathRouteKey;
  sampleCount: number;
  accuracy: number;
  medianMs?: number;
  p90Ms?: number;
  meanRelativeError?: number;
};

export type PathComparisonSummary = {
  routes: PathRouteSummary[];
  fastestRoute?: PathRouteKey;
  mostAccurateRoute?: PathRouteKey;
};

function percentile(values: number[], fraction: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

/** Uses the learner's actual route step times and errors; no route is hard-coded as best. */
export function summarizePathComparisons(
  sessions: TrainingSession[],
  userId: string,
): PathComparisonSummary {
  const rows: Record<
    PathRouteKey,
    { correct: number; times: number[]; errors: number[] }
  > = {
    direct: { correct: 0, times: [], errors: [] },
    split: { correct: 0, times: [], errors: [] },
    scale: { correct: 0, times: [], errors: [] },
  };

  for (const session of sessions) {
    if (
      session.status !== "completed" ||
      session.userId !== userId ||
      session.trainingMode !== "path_compare"
    )
      continue;
    for (const record of session.records) {
      for (const step of record.steps ?? []) {
        const route =
          step.stepType === "path_direct"
            ? "direct"
            : step.stepType === "path_split"
              ? "split"
              : step.stepType === "path_scale"
                ? "scale"
                : undefined;
        if (!route) continue;
        if (step.isCorrect) rows[route].correct += 1;
        if (!step.timingInterrupted && !step.skipped)
          rows[route].times.push(step.durationMs);
        const actual = Number(step.userValue);
        const expected = Number(step.expectedValue);
        if (
          Number.isFinite(actual) &&
          Number.isFinite(expected) &&
          expected !== 0
        )
          rows[route].errors.push(Math.abs(actual - expected) / Math.abs(expected));
      }
    }
  }

  const routes = (Object.keys(rows) as PathRouteKey[]).map((route) => {
    const row = rows[route];
    const sampleCount = Math.max(
      row.times.length,
      row.errors.length,
      row.correct,
    );
    return {
      route,
      sampleCount,
      accuracy: sampleCount ? row.correct / sampleCount : 0,
      medianMs: percentile(row.times, 0.5),
      p90Ms: percentile(row.times, 0.9),
      meanRelativeError: row.errors.length
        ? row.errors.reduce((sum, value) => sum + value, 0) / row.errors.length
        : undefined,
    };
  });
  const timed = routes.filter((route) => route.medianMs !== undefined);
  const fastestRoute = [...timed].sort(
    (left, right) => (left.medianMs ?? Infinity) - (right.medianMs ?? Infinity),
  )[0]?.route;
  const accurate = routes.filter((route) => route.sampleCount > 0);
  const mostAccurateRoute = [...accurate].sort(
    (left, right) =>
      right.accuracy - left.accuracy ||
      (left.meanRelativeError ?? Infinity) - (right.meanRelativeError ?? Infinity),
  )[0]?.route;
  return { routes, fastestRoute, mostAccurateRoute };
}
