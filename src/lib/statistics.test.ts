import { describe, expect, it } from "vitest";
import {
  getRating,
  ratingTarget,
  sessionMetrics,
  subtypesForType,
  trendPoints,
} from "./statistics";
import { TrainingSession } from "./types";

function session(overrides: Partial<TrainingSession> = {}): TrainingSession {
  const questions = Array.from({ length: 20 }, (_, index) => ({
    id: String(index),
  })) as TrainingSession["questions"];
  const records = questions.map((question, index) => ({
    question,
    userAnswer: "1",
    isCorrect: index < 19,
    accuracyLevel: "exact" as const,
    timeUsedMs: 2000,
    restartCount: 0,
    usedScratchpad: false,
  }));

  return {
    id: "session",
    userId: "fish",
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: questions.length,
    questions,
    currentIndex: 20,
    records,
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 48_000,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: 1,
    ...overrides,
  };
}

describe("training statistics", () => {
  it("calculates accuracy and average time", () => {
    const metrics = sessionMetrics(session());
    expect(metrics.correctCount).toBe(19);
    expect(metrics.accuracy).toBe(0.95);
    expect(metrics.averageMs).toBe(2400);
  });

  it("requires both speed and accuracy for an excellent rating", () => {
    expect(getRating(session())).toBe("优秀");
    expect(getRating(session({ accumulatedMs: 68_000 }))).toBe("良好");
    expect(
      getRating(
        session({
          records: session().records.map((record, index) => ({
            ...record,
            isCorrect: index < 17,
          })),
        }),
      ),
    ).toBe("继续加油");
  });

  it.each([30, 70, 100])(
    "scales rating thresholds linearly for %i questions",
    (questionCount) => {
      const questions = Array.from({ length: questionCount }, (_, index) => ({
        id: `question-${index}`,
      })) as TrainingSession["questions"];
      const records = questions.map((question) => ({
        question,
        userAnswer: "1",
        isCorrect: true,
        accuracyLevel: "exact" as const,
        timeUsedMs: 0,
        restartCount: 0,
        usedScratchpad: false,
      }));
      const scaledExcellentMs = questionCount * 2_500;

      expect(
        getRating(
          session({
            questionCount,
            questions,
            records,
            accumulatedMs: scaledExcellentMs,
          }),
        ),
      ).toBe("优秀");
      expect(
        getRating(
          session({
            questionCount,
            questions,
            records,
            accumulatedMs: scaledExcellentMs + 1,
          }),
        ),
      ).toBe("良好");
    },
  );

  it.each([10, 20, 50])(
    "keeps the existing %i-question rating scale",
    (questionCount) => {
      const questions = Array.from({ length: questionCount }, (_, index) => ({
        id: `legacy-question-${index}`,
      })) as TrainingSession["questions"];
      const records = questions.map((question) => ({
        question,
        userAnswer: "1",
        isCorrect: true,
        accuracyLevel: "exact" as const,
        timeUsedMs: 0,
        restartCount: 0,
        usedScratchpad: false,
      }));

      expect(
        getRating(
          session({
            questionCount,
            questions,
            records,
            accumulatedMs: questionCount * 2_500,
          }),
        ),
      ).toBe("优秀");
    },
  );

  it("keeps incompatible answer rules on separate tracks", () => {
    expect(subtypesForType("three_by_two_division")).toEqual([
      "quotient_first",
      "quotient_two",
    ]);
    expect(subtypesForType("fraction_percent_conversion")).toEqual([
      "fraction_to_percent",
      "percent_to_fraction",
    ]);
  });

  it("filters trends by user, type and subtype", () => {
    const included = session({ id: "included", startedAt: 2 });
    const excluded = session({ id: "excluded", userId: "cat", startedAt: 3 });
    expect(
      trendPoints(
        [included, excluded],
        "fish",
        "two_digit_add_subtract",
        "standard",
      ),
    ).toHaveLength(1);
  });

  it("keeps every matching session and aggregates only dense histories", () => {
    const sessions = Array.from({ length: 101 }, (_, index) =>
      session({ id: String(index), startedAt: index + 1 }),
    );
    const points = trendPoints(
      sessions,
      "fish",
      "two_digit_add_subtract",
      "standard",
    );

    expect(points.length).toBeLessThanOrEqual(25);
    expect(points.reduce((sum, point) => sum + point.sessionCount, 0)).toBe(
      101,
    );
    expect(points[0].label).toBe("第1–4次");
    expect(points.at(-1)?.label).toBe("第97–101次");
  });

  it.each([
    [10, 10],
    [100, 20],
    [1_000, 30],
  ])(
    "uses a readable trend granularity for %i sessions",
    (sessionCount, expectedPointCount) => {
      const sessions = Array.from({ length: sessionCount }, (_, index) =>
        session({ id: String(index), startedAt: index + 1 }),
      );
      const points = trendPoints(
        sessions,
        "fish",
        "two_digit_add_subtract",
        "standard",
      );

      expect(points).toHaveLength(expectedPointCount);
      expect(points.reduce((sum, point) => sum + point.sessionCount, 0)).toBe(
        sessionCount,
      );
    },
  );

  it("returns the correct reference target", () => {
    expect(ratingTarget("two_digit_add_subtract").excellentSeconds).toBe(50);
  });

  it("weights aggregated duration and accuracy by actual question count", () => {
    const shortFast = session({
      id: "short",
      questions: session().questions.slice(0, 10),
      records: session().records.slice(0, 10),
      accumulatedMs: 10_000,
      startedAt: 1,
    });
    const longSlow = session({
      id: "long",
      questions: session().questions,
      records: session().records.map((record, index) => ({
        ...record,
        isCorrect: index < 10,
      })),
      accumulatedMs: 100_000,
      startedAt: 2,
    });
    const points = trendPoints(
      [shortFast, longSlow],
      "fish",
      "two_digit_add_subtract",
      "standard",
    );

    expect(points).toHaveLength(2);
    const aggregate = trendPoints(
      Array.from({ length: 101 }, (_, index) =>
        index === 0
          ? shortFast
          : { ...longSlow, id: `long-${index}`, startedAt: index + 2 },
      ),
      "fish",
      "two_digit_add_subtract",
      "standard",
    );
    expect(aggregate.reduce((sum, point) => sum + point.sessionCount, 0)).toBe(
      101,
    );
    // 101 sessions use 25 proportional buckets, so the first bucket contains
    // four records. The value is weighted by 10 + 3×20 questions, not by the
    // number of sessions.
    expect(aggregate[0]).toMatchObject({
      sessionCount: 4,
      averageSeconds: 4.4,
      accuracyPercent: 57,
    });
  });

  it("never mixes answer rules even when all sessions share the same question type", () => {
    const first = session({
      questionType: "three_by_two_division",
      subtype: "quotient_first",
    });
    const second = session({
      id: "two",
      questionType: "three_by_two_division",
      subtype: "quotient_two",
    });

    expect(
      trendPoints(
        [first, second],
        "fish",
        "three_by_two_division",
        "quotient_first",
      ),
    ).toHaveLength(1);
    expect(
      trendPoints(
        [first, second],
        "fish",
        "three_by_two_division",
        "quotient_two",
      ),
    ).toHaveLength(1);
  });
});
