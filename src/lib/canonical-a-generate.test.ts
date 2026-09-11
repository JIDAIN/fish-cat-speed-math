import { describe, expect, it } from "vitest";
import { GenerationContext } from "./generate";
import {
  canonicalAAbilityIds,
  generateCanonicalAQuestion,
  generateCanonicalASet,
  gradeCanonicalAQuestion,
} from "./canonical-a-generate";
import { DifficultyBand } from "./types";

function context(seed = 1): GenerationContext {
  let state = seed >>> 0;
  let id = 0;
  return {
    random: () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    },
    createId: () => `canonical-a-${seed}-${id++}`,
  };
}

function contextWithRandoms(values: readonly number[]): GenerationContext {
  let index = 0;
  let id = 0;
  return {
    random: () => values[index++] ?? 0.42,
    createId: () => `canonical-a-controlled-${id++}`,
  };
}

describe("canonical A ability generators", () => {
  it("contains exactly the eight audited A abilities", () => {
    expect(canonicalAAbilityIds).toEqual([
      "A-ADD-01",
      "A-SUB-01",
      "A-COM-01",
      "A-MUL-01",
      "A-MUL-02",
      "A-MUL-03",
      "A-FRA-01",
      "A-PCT-01",
    ]);
  });

  it.each(["L1", "L2", "L3"] as const)(
    "generates all eight abilities in %s with canonical metadata",
    (difficultyBand) => {
      canonicalAAbilityIds.forEach((abilityId, index) => {
        const generated = generateCanonicalAQuestion(
          abilityId,
          difficultyBand,
          context(100 + index),
        );
        expect(generated.skillId).toBe(abilityId);
        expect(generated.difficultyBand).toBe(difficultyBand);
        expect(generated.generationRuleVersion).toBe("a-canonical-1.0.0");
        expect(generated.generatorParams).toMatchObject({
          generatorFamily: "a_canonical",
          abilityId,
        });
      });
    },
  );

  it("uses one-click choices for the four reaction abilities", () => {
    const reactionIds = [
      "A-COM-01",
      "A-MUL-01",
      "A-MUL-02",
      "A-FRA-01",
    ] as const;
    reactionIds.forEach((abilityId, index) => {
      const generated = generateCanonicalAQuestion(
        abilityId,
        "L2",
        context(200 + index),
      );
      expect(generated.inputKind).toBe("choice");
      expect(generated.data.choiceValues).toHaveLength(4);
      expect(generated.data.choiceLabels).toHaveLength(4);
      expect(generated.allowedAnswerSet).toEqual([generated.answer]);
      expect(gradeCanonicalAQuestion(generated, generated.answer).isCorrect).toBe(true);
    });
  });

  it("uses numeric input for the four calculation abilities", () => {
    const calculationIds = [
      "A-ADD-01",
      "A-SUB-01",
      "A-MUL-03",
      "A-PCT-01",
    ] as const;
    calculationIds.forEach((abilityId, index) => {
      const generated = generateCanonicalAQuestion(
        abilityId,
        "L2",
        context(300 + index),
      );
      expect(generated.inputKind).toBe("number");
      expect(gradeCanonicalAQuestion(generated, generated.answer).isCorrect).toBe(true);
    });
  });

  it("keeps addition and subtraction inside two to three digits", () => {
    const bands: DifficultyBand[] = ["L1", "L2", "L3"];
    bands.forEach((band, bandIndex) => {
      const addSet = generateCanonicalASet(
        "A-ADD-01",
        band,
        20,
        context(400 + bandIndex),
      );
      const subSet = generateCanonicalASet(
        "A-SUB-01",
        band,
        20,
        context(500 + bandIndex),
      );
      for (const question of [...addSet, ...subSet]) {
        const a = Number(question.data.a);
        const b = Number(question.data.b);
        expect(String(Math.abs(a)).length).toBeGreaterThanOrEqual(2);
        expect(String(Math.abs(a)).length).toBeLessThanOrEqual(3);
        expect(String(Math.abs(b)).length).toBeGreaterThanOrEqual(2);
        expect(String(Math.abs(b)).length).toBeLessThanOrEqual(3);
      }
    });
  });

  it("keeps near-difference bands bounded and signed", () => {
    const expectedBands: Record<DifficultyBand, [number, number]> = {
      L1: [1, 5],
      L2: [6, 10],
      L3: [11, 30],
    };
    (Object.keys(expectedBands) as DifficultyBand[]).forEach((band, index) => {
      const questions = generateCanonicalASet(
        "A-COM-01",
        band,
        20,
        context(600 + index),
      );
      const [min, max] = expectedBands[band];
      questions.forEach((question) => {
        const difference = Math.abs(Number(question.answer));
        expect(difference).toBeGreaterThanOrEqual(min);
        expect(difference).toBeLessThanOrEqual(max);
      });
    });
  });

  it("contains every approved percentage anchor under the unified A-PCT-01 ability", () => {
    const approvedAnchors = [
      "0.1%",
      "1%",
      "2%",
      "2.5%",
      "3%",
      "5%",
      "10%",
      "12.5%",
      "20%",
      "25%",
      "33.3%",
      "50%",
    ] as const;

    approvedAnchors.forEach((expectedAnchor, index) => {
      const generated = generateCanonicalAQuestion(
        "A-PCT-01",
        "L2",
        contextWithRandoms([(index + 0.5) / approvedAnchors.length, 0.42]),
      );
      expect(generated.data.rateAnchor).toBe(expectedAnchor);
    });
  });
});
