import { describe, expect, it } from "vitest";
import {
  buildScalingOptions,
  calculateScalingTruth,
  formatScalingOptionValue,
  leadingSignificantDigit,
  preferredScalingBaseline,
  scalingBaselineCandidates,
  SCALING_METHOD_SCENARIO_QUOTAS,
} from "./scaling-method";

describe("scaling method math core", () => {
  it("uses the product delta convention B0 - B", () => {
    const truth = calculateScalingTruth(68431, 424, 400);
    expect(truth.signedDelta).toBe(-24);
    expect(truth.rPercent).toBeCloseTo(6, 10);
    expect(truth.rSquaredPercent).toBeCloseTo(0.36, 10);
  });

  it("calculates first and second order correction for a larger real denominator", () => {
    const truth = calculateScalingTruth(68431, 424, 400);
    expect(truth.baseResult).toBeCloseTo(171.0775, 8);
    expect(truth.firstCorrection).toBeLessThan(0);
    expect(truth.firstResult).toBeCloseTo(160.81285, 5);
    expect(truth.secondCorrection).toBeGreaterThan(0);
    expect(truth.secondResult).toBeCloseTo(161.428729, 5);
    expect(truth.exactResult).toBeCloseTo(161.3938679, 5);
  });

  it("calculates a positive first correction when the real denominator is smaller", () => {
    const truth = calculateScalingTruth(68431, 376, 400);
    expect(truth.signedDelta).toBe(24);
    expect(truth.firstCorrection).toBeGreaterThan(0);
    expect(truth.secondCorrection).toBeGreaterThan(0);
    expect(truth.secondResult).toBeGreaterThan(truth.firstResult);
  });

  it("uses source-scenario quotas of 45 percent base period, 35 percent ratio/share, 20 percent multiple", () => {
    expect(SCALING_METHOD_SCENARIO_QUOTAS).toEqual([
      { scenario: "base_period", ratio: 0.45 },
      { scenario: "ratio_share", ratio: 0.35 },
      { scenario: "multiple", ratio: 0.2 },
    ]);
  });

  it("keeps every proposed baseline within the configured 10 percent window", () => {
    const candidates = scalingBaselineCandidates(68431, 424);
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach((candidate) => {
      expect(candidate.relativeDeviation).toBeLessThanOrEqual(0.1);
    });
  });

  it("can prefer a highly calculable baseline instead of blindly using the nearest number", () => {
    const candidate = preferredScalingBaseline(68400, 424);
    expect(candidate).toBeDefined();
    expect(candidate?.baseline).toBe(400);
    expect(candidate?.truth.baseResult).toBe(171);
  });

  for (const significantDigits of [3, 4] as const) {
    it(`builds four ${significantDigits}-significant-digit choices with the same leading digit`, () => {
      const truth = calculateScalingTruth(68431, 424, 400);
      const { options, correctOptionId } = buildScalingOptions(
        truth,
        significantDigits,
      );
      expect(options).toHaveLength(4);
      expect(new Set(options.map((option) => option.value)).size).toBe(4);
      expect(["A", "B", "C", "D"]).toContain(correctOptionId);
      expect(options.filter((option) => option.id === correctOptionId)).toHaveLength(1);

      const leadingDigits = new Set(
        options.map((option) => leadingSignificantDigit(option.value)),
      );
      expect(leadingDigits.size).toBe(1);
      options.forEach((option) => {
        expect(option.significantDigits).toBe(significantDigits);
        expect(option.display).toBe(
          formatScalingOptionValue(option.value, significantDigits),
        );
      });
    });
  }

  it("preserves trailing zeroes in option display when precision requires them", () => {
    expect(formatScalingOptionValue(2.3, 3)).toBe("2.30");
    expect(formatScalingOptionValue(16, 4)).toBe("16.00");
  });

  it("rejects non-positive inputs instead of silently producing invalid math", () => {
    expect(() => calculateScalingTruth(100, 0, 100)).toThrow();
    expect(() => calculateScalingTruth(-1, 100, 100)).toThrow();
  });
});
