import { describe, expect, it } from "vitest";
import {
  assessRating,
  createRatingSnapshot,
  getRating,
  ratingTarget,
  sessionMetrics,
  summarizeHistory,
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
    const perfect = session({
      accumulatedMs: 40_000,
      records: session().records.map((record) => ({
        ...record,
        isCorrect: true,
      })),
    });
    expect(getRating(perfect)).toBe("优秀");
    expect(getRating({ ...perfect, accumulatedMs: 40_001 })).toBe("良好");
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
      const scaledExcellentMs = questionCount * 2_000;

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
            accumulatedMs: questionCount * 2_000,
          }),
        ),
      ).toBe("优秀");
    },
  );

  it("keeps incompatible answer rules on separate tracks", () => {
    expect(subtypesForType("three_by_two_division")).toEqual([
      "quotient_first",
      "quotient_two",
      "quotient_estimate_3_percent",
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
        20,
      ),
    ).toHaveLength(1);
  });

  it("filters trends by the frozen question-set length", () => {
    const ten = session({
      id: "ten",
      questions: session().questions.slice(0, 10),
      records: session().records.slice(0, 10),
      questionCount: 20,
    });
    const twenty = session({ id: "twenty" });

    // questionCount is deliberately stale on the first session: legacy
    // history is grouped by the frozen set length, never an inferred field.
    expect(
      trendPoints(
        [ten, twenty],
        "fish",
        "two_digit_add_subtract",
        "standard",
        10,
      ),
    ).toHaveLength(1);
    expect(
      trendPoints(
        [ten, twenty],
        "fish",
        "two_digit_add_subtract",
        "standard",
        20,
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
      20,
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
        20,
      );

      expect(points).toHaveLength(expectedPointCount);
      expect(points.reduce((sum, point) => sum + point.sessionCount, 0)).toBe(
        sessionCount,
      );
    },
  );

  it("returns the correct reference target", () => {
    expect(
      ratingTarget("two_digit_add_subtract", "standard").excellentSeconds,
    ).toBe(80);
  });

  it("uses independent division and percentage-conversion standards", () => {
    expect(
      ratingTarget("three_by_two_division", "quotient_first").passSeconds,
    ).toBe(60);
    expect(
      ratingTarget("three_by_two_division", "quotient_two").passSeconds,
    ).toBe(240);
    expect(
      ratingTarget("three_by_two_division", "quotient_estimate_3_percent")
        .passSeconds,
    ).toBe(120);
    expect(
      ratingTarget("fraction_percent_conversion", "fraction_to_percent")
        .passSeconds,
    ).toBe(100);
    expect(
      ratingTarget("fraction_percent_conversion", "percent_to_fraction")
        .passSeconds,
    ).toBe(110);
  });

  it("uses explainable count-specific accuracy requirements and freezes new results", () => {
    const ten = session({
      questions: session().questions.slice(0, 10),
      records: session()
        .records.slice(0, 10)
        .map((record, index) => ({
          ...record,
          isCorrect: index < 9,
        })),
      accumulatedMs: 30_000,
    });
    expect(assessRating(ten).standards).toMatchObject([
      { level: "优秀", minCorrect: 10 },
      { level: "良好", minCorrect: 9 },
      { level: "合格", minCorrect: 9 },
    ]);
    const frozen = { ...ten, rating: createRatingSnapshot(ten) };
    expect(getRating(frozen)).toBe(frozen.rating.level);
  });

  it("summarizes history with question-weighted accuracy and speed", () => {
    const short = session({
      questions: session().questions.slice(0, 10),
      records: session()
        .records.slice(0, 10)
        .map((record, index) => ({
          ...record,
          isCorrect: index < 10,
        })),
      accumulatedMs: 10_000,
      startedAt: 2,
    });
    const long = session({
      records: session().records.map((record, index) => ({
        ...record,
        isCorrect: index < 10,
      })),
      accumulatedMs: 60_000,
      startedAt: 1,
    });
    const summary = summarizeHistory([long, short]);
    expect(summary).toMatchObject({
      sessionCount: 2,
      questionCount: 30,
      correctCount: 20,
      accuracy: 20 / 30,
      averageMs: 70_000 / 30,
    });
  });

  it("keeps count-isolated trend buckets measured by total session time", () => {
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
      20,
    );

    expect(points).toHaveLength(1);
    const aggregate = trendPoints(
      Array.from({ length: 101 }, (_, index) => ({
        ...longSlow,
        id: `long-${index}`,
        startedAt: index + 1,
      })),
      "fish",
      "two_digit_add_subtract",
      "standard",
      20,
    );
    expect(aggregate.reduce((sum, point) => sum + point.sessionCount, 0)).toBe(
      101,
    );
    // 101 sessions use 25 proportional buckets, so the first bucket contains
    // four records. Each point is a per-session mean total time, so all 100s
    // sessions remain 100 seconds regardless of bucket size.
    expect(aggregate[0]).toMatchObject({
      sessionCount: 4,
      totalSeconds: 100,
      accuracyPercent: 50,
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
        20,
      ),
    ).toHaveLength(1);
    expect(
      trendPoints(
        [first, second],
        "fish",
        "three_by_two_division",
        "quotient_two",
        20,
      ),
    ).toHaveLength(1);
  });
});
