import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOM_QUESTION_COUNT,
  isValidQuestionCount,
  questionCountOptions,
} from "./question-count";

describe("question count contract", () => {
  it("accepts every supported ten-question increment", () => {
    expect(questionCountOptions).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
    ]);
    questionCountOptions.forEach((count) => {
      expect(isValidQuestionCount(count)).toBe(true);
    });
  });

  it.each([0, 5, 15, 25, 99, 110, -10, 10.5, NaN, "20", null, undefined])(
    "rejects invalid question count %p",
    (count) => {
      expect(isValidQuestionCount(count)).toBe(false);
    },
  );

  it("uses thirty questions as the first custom-mode value", () => {
    expect(DEFAULT_CUSTOM_QUESTION_COUNT).toBe(30);
  });
});
