export type ScalingStructure =
  | "round_baseline"
  | "special_baseline"
  | "multiple_relation";

export const SCALING_METHOD_STRUCTURE_QUOTAS = [
  { primaryStructure: "round_baseline", ratio: 0.4 },
  { primaryStructure: "special_baseline", ratio: 0.35 },
  { primaryStructure: "multiple_relation", ratio: 0.25 },
] as const;

export const SPECIAL_SCALING_BASELINES = [
  125,
  143,
  167,
  200,
  250,
  333,
  400,
  500,
] as const;

export type ScalingOptionId = "A" | "B" | "C" | "D";

export interface ScalingTruth {
  numerator: number;
  denominator: number;
  baseline: number;
  /** Product convention: Δ = B0 - B. */
  signedDelta: number;
  r: number;
  rPercent: number;
  rSquared: number;
  rSquaredPercent: number;
  baseResult: number;
  firstCorrection: number;
  firstResult: number;
  secondCorrection: number;
  secondResult: number;
  exactResult: number;
}

export interface ScalingBaselineCandidate {
  baseline: number;
  relativeDeviation: number;
  truth: ScalingTruth;
  score: number;
  reasons: string[];
}

export interface ScalingOption {
  id: ScalingOptionId;
  value: number;
  source:
    | "correct"
    | "base_result"
    | "first_order"
    | "wrong_direction"
    | "nearby";
}

const OPTION_IDS: ScalingOptionId[] = ["A", "B", "C", "D"];

export function calculateScalingTruth(
  numerator: number,
  denominator: number,
  baseline: number,
): ScalingTruth {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    !Number.isFinite(baseline) ||
    numerator <= 0 ||
    denominator <= 0 ||
    baseline <= 0
  ) {
    throw new RangeError("放缩法参数必须是正数。");
  }

  const signedDelta = baseline - denominator;
  const r = Math.abs(denominator - baseline) / baseline;
  const baseResult = numerator / baseline;
  const firstCorrection =
    denominator > baseline ? -baseResult * r : baseResult * r;
  const firstResult = baseResult + firstCorrection;
  const secondCorrection = baseResult * r * r;
  const secondResult = firstResult + secondCorrection;

  return {
    numerator,
    denominator,
    baseline,
    signedDelta,
    r,
    rPercent: r * 100,
    rSquared: r * r,
    rSquaredPercent: r * r * 100,
    baseResult,
    firstCorrection,
    firstResult,
    secondCorrection,
    secondResult,
    exactResult: numerator / denominator,
  };
}

function addCandidate(target: Set<number>, value: number) {
  if (Number.isInteger(value) && value > 0) target.add(value);
}

/**
 * Returns plausible oral-calculation baselines. It intentionally generates
 * candidates first and scores them later; the nearest round number is not
 * automatically treated as the best baseline.
 */
export function scalingBaselineCandidates(
  numerator: number,
  denominator: number,
  maxRelativeDeviation = 0.1,
): ScalingBaselineCandidate[] {
  if (denominator <= 0) return [];

  const raw = new Set<number>();
  const tens = Math.max(10, Math.round(denominator / 10) * 10);
  const hundreds = Math.max(100, Math.round(denominator / 100) * 100);

  for (const offset of [-20, -10, 0, 10, 20]) addCandidate(raw, tens + offset);
  for (const offset of [-200, -100, 0, 100, 200])
    addCandidate(raw, hundreds + offset);

  for (const baseline of SPECIAL_SCALING_BASELINES) addCandidate(raw, baseline);

  // Multiplicative baselines: if A is near k * B0, B0 = A / k can make Q0
  // immediately recognizable. Only integer candidates are retained.
  for (let multiple = 2; multiple <= 9; multiple += 1) {
    const candidate = Math.round(numerator / multiple);
    addCandidate(raw, candidate);
  }

  return [...raw]
    .map((baseline) => {
      const relativeDeviation = Math.abs(denominator - baseline) / baseline;
      if (relativeDeviation > maxRelativeDeviation) return undefined;
      const truth = calculateScalingTruth(numerator, denominator, baseline);
      const reasons: string[] = [];
      let score = relativeDeviation * 100;

      if (baseline % 100 === 0) {
        score -= 1.2;
        reasons.push("整百基准");
      } else if (baseline % 10 === 0) {
        score -= 0.7;
        reasons.push("整十基准");
      }

      if ((SPECIAL_SCALING_BASELINES as readonly number[]).includes(baseline)) {
        score -= 1;
        reasons.push("特殊友好基准");
      }

      const q0 = truth.baseResult;
      const distanceToInteger = Math.abs(q0 - Math.round(q0));
      const distanceToTenth = Math.abs(q0 * 10 - Math.round(q0 * 10));
      if (distanceToInteger < 1e-10) {
        score -= 2;
        reasons.push("基准结果为整数");
      } else if (distanceToTenth < 1e-10) {
        score -= 1;
        reasons.push("基准结果一位小数");
      }

      const nearestMultiple = Math.round(q0);
      if (nearestMultiple >= 2 && nearestMultiple <= 9 && distanceToInteger < 0.03) {
        score -= 1.2;
        reasons.push("倍数关系明显");
      }

      return { baseline, relativeDeviation, truth, score, reasons };
    })
    .filter((item): item is ScalingBaselineCandidate => Boolean(item))
    .sort((left, right) => left.score - right.score || left.baseline - right.baseline);
}

export function preferredScalingBaseline(
  numerator: number,
  denominator: number,
  maxRelativeDeviation = 0.1,
) {
  return scalingBaselineCandidates(
    numerator,
    denominator,
    maxRelativeDeviation,
  )[0];
}

function roundExamValue(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100) return Math.round(value * 10) / 10;
  if (abs >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

function distinctValues(values: number[]) {
  const result: number[] = [];
  for (const value of values) {
    const rounded = roundExamValue(value);
    if (!result.some((saved) => Math.abs(saved - rounded) < 1e-9)) result.push(rounded);
  }
  return result;
}

/**
 * Generates four exam-style choices from meaningful method states instead of
 * random noise. The correct choice is the rounded exact quotient.
 */
export function buildScalingOptions(truth: ScalingTruth): {
  options: ScalingOption[];
  correctOptionId: ScalingOptionId;
} {
  const wrongDirection =
    truth.baseResult - truth.firstCorrection + truth.secondCorrection;
  const nearbyStep = Math.max(Math.abs(truth.exactResult) * 0.025, 0.5);
  const candidates: Array<{ value: number; source: ScalingOption["source"] }> = [
    { value: truth.exactResult, source: "correct" },
    { value: truth.baseResult, source: "base_result" },
    { value: truth.firstResult, source: "first_order" },
    { value: wrongDirection, source: "wrong_direction" },
    { value: truth.exactResult + nearbyStep, source: "nearby" },
    { value: truth.exactResult - nearbyStep, source: "nearby" },
  ];

  const unique = distinctValues(candidates.map((candidate) => candidate.value));
  while (unique.length < 4) {
    const sign = unique.length % 2 === 0 ? 1 : -1;
    unique.push(roundExamValue(truth.exactResult + sign * nearbyStep * (unique.length + 1)));
  }

  const selectedValues = unique.slice(0, 4).sort((a, b) => a - b);
  const options = selectedValues.map((value, index) => {
    const matching = candidates.find(
      (candidate) => Math.abs(roundExamValue(candidate.value) - value) < 1e-9,
    );
    return {
      id: OPTION_IDS[index],
      value,
      source: matching?.source ?? "nearby",
    };
  });

  const correctValue = roundExamValue(truth.exactResult);
  const correctOption = options.find(
    (option) => Math.abs(option.value - correctValue) < 1e-9,
  );
  if (!correctOption) throw new Error("放缩法选项生成未保留正确答案。");

  return { options, correctOptionId: correctOption.id };
}

export function isFirstOrderSufficient(
  truth: ScalingTruth,
  options: readonly ScalingOption[],
) {
  const first = roundExamValue(truth.firstResult);
  const ordered = [...options]
    .map((option) => ({ option, distance: Math.abs(option.value - first) }))
    .sort((left, right) => left.distance - right.distance);
  if (ordered.length < 2) return true;
  return ordered[0].distance + 1e-9 < ordered[1].distance * 0.6;
}
