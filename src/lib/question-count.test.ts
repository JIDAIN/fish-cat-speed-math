import { describe, expect, it } from "vitest";
import {
  isValidNewTrainingQuestionCount,
  isValidStoredQuestionCount,
  legacyQuestionCountOptions,
  questionCountOptions,
} from "./question-count";

describe("question count contract", () => {
  it("offers only 10 or 20 questions for newly-created sessions", () => {
    expect(questionCountOptions).toEqual([10, 20]);
    expect(isValidNewTrainingQuestionCount(10)).toBe(true);
    expect(isValidNewTrainingQuestionCount(20)).toBe(true);
    expect(isValidNewTrainingQuestionCount(30)).toBe(false);
    expect(isValidNewTrainingQuestionCount(100)).toBe(false);
  });

  it("keeps the historical 10–100 reader contract", () => {
    expect(legacyQuestionCountOptions).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    legacyQuestionCountOptions.forEach((count) => {
      expect(isValidStoredQuestionCount(count)).toBe(true);
    });
  });

  it.each([0, 5, 15, 25, 99, 110, -10, 10.5, NaN, "20", null, undefined])(
    "rejects invalid stored count %p",
    (count) => {
      expect(isValidStoredQuestionCount(count)).toBe(false);
    },
  );
});
