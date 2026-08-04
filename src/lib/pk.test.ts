import { describe, expect, it } from "vitest";
import {
  PKChallenge,
  isWithinLastSevenNaturalDays,
  paginate,
  pkOutcome,
} from "./pk";
import { TrainingSession } from "./types";

function session(
  id: string,
  role: string,
  correct: boolean[],
  elapsedMs: number,
): TrainingSession {
  return {
    id,
    userId: role,
    ownerAccountId: `${role}-id`,
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: correct.length,
    questions: correct.map((_, index) => ({
      id: `${id}-${index}`,
      type: "two_digit_add_subtract",
      subtype: "standard",
      prompt: "1+1",
      answer: "2",
      data: {},
      difficulty: { level: 1, tags: [] },
      primaryStructure: "x",
      secondaryTags: [],
      generationRuleVersion: "test",
    })),
    currentIndex: correct.length,
    records: correct.map((isCorrect, index) => ({
      question: {
        id: `${id}-${index}`,
        type: "two_digit_add_subtract",
        subtype: "standard",
        prompt: "1+1",
        answer: "2",
        data: {},
        difficulty: { level: 1, tags: [] },
        primaryStructure: "x",
        secondaryTags: [],
        generationRuleVersion: "test",
      },
      userAnswer: isCorrect ? "2" : "3",
      isCorrect,
      accuracyLevel: isCorrect ? "exact" : "wrong",
      timeUsedMs: elapsedMs / correct.length,
      restartCount: 0,
      usedScratchpad: false,
    })),
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: elapsedMs,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: 1,
  };
}
function challenge(): PKChallenge {
  return {
    id: "pk",
    challengerId: "fish-id",
    challengerRole: "fish",
    opponentId: "cat-id",
    opponentRole: "cat",
    sourceSessionId: "fish",
    frozenSession: session("fish", "fish", [true, true, true], 5000),
    opponentSessionId: "cat",
    createdAt: 1,
    completedAt: 2,
    status: "completed",
  };
}

describe("PK outcome and retention", () => {
  it("uses correct count before elapsed time and then supports draws", () => {
    expect(
      pkOutcome(challenge(), session("cat", "cat", [true, true, false], 1000)),
    ).toBe("fish");
    expect(
      pkOutcome(challenge(), session("cat", "cat", [true, true, true], 4000)),
    ).toBe("cat");
    expect(
      pkOutcome(challenge(), session("cat", "cat", [true, true, true], 5000)),
    ).toBe("draw");
  });
  it("keeps the current natural day and previous six days", () => {
    const now = new Date("2026-08-10T12:00:00").getTime();
    expect(
      isWithinLastSevenNaturalDays(
        new Date("2026-08-04T00:00:00").getTime(),
        now,
      ),
    ).toBe(true);
    expect(
      isWithinLastSevenNaturalDays(
        new Date("2026-08-03T23:59:59").getTime(),
        now,
      ),
    ).toBe(false);
  });
  it("clamps paginated lists when data shrinks", () => {
    expect(paginate([1, 2, 3], 3, 2)).toMatchObject({
      page: 2,
      totalPages: 2,
      items: [3],
    });
  });
});
