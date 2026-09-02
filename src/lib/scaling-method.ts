export type ScalingScenario = "base_period" | "ratio_share" | "multiple";

/**
 * Primary generation quota follows the source of the calculation in data-analysis
 * questions. Baseline shape is a secondary tag and must not drive the top-level
 * question mix.
 */
export const SCALING_METHOD_SCENARIO_QUOTAS = [
  { scenario: "base_period", ratio: 0.45 },
  { scenario: "ratio_share", ratio: 0.35 },
  { scenario: "multiple", ratio: 0.2 },
] as const;

export type ScalingStructure =
  | "round_baseline"
  | "special_baseline"
  | "relation_baseline";

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
export type ScalingOptionSignificantDigits = 3 | 4;
export const SCALING_OPTION_SIGNIFICANT_DIGITS = [3, 4] as const;

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
  display: string;
  significantDigits: ScalingOptionSignificantDigits;
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

  // Relationship baselines: if A is near k * B0, B0 = A / k can make Q0
  // immediately recognizable. This is a baseline property, not the same thing
  // as the top-level "multiple" data-analysis scenario.
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
        reasons.push("数值关系明显");
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

export function roundToSignificantDigits(
  value: number,
  significantDigits: ScalingOptionSignificantDigits,
) {
  if (!Number.isFinite(value) || value === 0) return value;
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const scale = 10 ** (significantDigits - 1 - exponent);
  return Math.round(value * scale) / scale;
}

/** UI string that preserves trailing zeroes for 3/4-significant-digit choices. */
export function formatScalingOptionValue(
  value: number,
  significantDigits: ScalingOptionSignificantDigits,
) {
  const rounded = roundToSignificantDigits(value, significantDigits);
  if (!Number.isFinite(rounded) || rounded === 0) return String(rounded);
  const exponent = Math.floor(Math.log10(Math.abs(rounded)));
  const decimals = Math.max(0, significantDigits - 1 - exponent);
  return rounded.toFixed(decimals);
}

export function leadingSignificantDigit(value: number) {
  if (!Number.isFinite(value) || value === 0) return 0;
  const absolute = Math.abs(value);
  const exponent = Math.floor(Math.log10(absolute));
  return Math.floor(absolute / 10 ** exponent + 1e-10);
}

function sameRoundedValue(left: number, right: number) {
  return Math.abs(left - right) < 1e-10;
}

/**
 * Generates four exam-style choices from meaningful method states.
 *
 * Every choice is rendered with the same 3- or 4-significant-digit precision,
 * and every choice must have the same leading significant digit as the correct
 * answer. This prevents a single first-digit division step from solving the
 * question before the scaling correction is actually used.
 */
export function buildScalingOptions(
  truth: ScalingTruth,
  significantDigits: ScalingOptionSignificantDigits = 4,
): {
  options: ScalingOption[];
  correctOptionId: ScalingOptionId;
} {
  const correctValue = roundToSignificantDigits(
    truth.exactResult,
    significantDigits,
  );
  const correctLeadingDigit = leadingSignificantDigit(correctValue);
  const wrongDirection =
    truth.baseResult - truth.firstCorrection + truth.secondCorrection;

  const candidates: Array<{
    value: number;
    source: ScalingOption["source"];
  }> = [
    { value: truth.exactResult, source: "correct" },
    { value: truth.firstResult, source: "first_order" },
    { value: truth.baseResult, source: "base_result" },
    { value: wrongDirection, source: "wrong_direction" },
  ];

  const chosen: Array<{
    value: number;
    source: ScalingOption["source"];
  }> = [];
  const tryAdd = (value: number, source: ScalingOption["source"]) => {
    const rounded = roundToSignificantDigits(value, significantDigits);
    if (!Number.isFinite(rounded) || rounded <= 0) return;
    if (leadingSignificantDigit(rounded) !== correctLeadingDigit) return;
    if (chosen.some((item) => sameRoundedValue(item.value, rounded))) return;
    chosen.push({ value: rounded, source });
  };

  candidates.forEach((candidate) => tryAdd(candidate.value, candidate.source));

  // If method-state distractors collide after rounding or cross the first-digit
  // boundary, fill from nearby values while preserving the same first digit.
  const exponent = Math.floor(Math.log10(Math.abs(correctValue)));
  const precisionUnit = 10 ** (exponent - significantDigits + 1);
  const nearbyStep = Math.max(
    precisionUnit,
    roundToSignificantDigits(Math.abs(correctValue) * 0.025, significantDigits),
  );
  for (let ring = 1; chosen.length < 4 && ring <= 40; ring += 1) {
    tryAdd(correctValue - nearbyStep * ring, "nearby");
    if (chosen.length < 4)
      tryAdd(correctValue + nearbyStep * ring, "nearby");
  }

  if (chosen.length < 4) {
    throw new Error("无法生成首位相同的四个放缩法选项。");
  }

  const selected = chosen
    .slice(0, 4)
    .sort((left, right) => left.value - right.value);
  const options = selected.map((item, index) => ({
    id: OPTION_IDS[index],
    value: item.value,
    display: formatScalingOptionValue(item.value, significantDigits),
    significantDigits,
    source: item.source,
  }));

  const correctOption = options.find((option) =>
    sameRoundedValue(option.value, correctValue),
  );
  if (!correctOption) throw new Error("放缩法选项生成未保留正确答案。");

  return { options, correctOptionId: correctOption.id };
}

export function isFirstOrderSufficient(
  truth: ScalingTruth,
  options: readonly ScalingOption[],
) {
  const significantDigits = options[0]?.significantDigits ?? 4;
  const first = roundToSignificantDigits(
    truth.firstResult,
    significantDigits,
  );
  const ordered = [...options]
    .map((option) => ({ option, distance: Math.abs(option.value - first) }))
    .sort((left, right) => left.distance - right.distance);
  if (ordered.length < 2) return true;
  return ordered[0].distance + 1e-9 < ordered[1].distance * 0.6;
}
