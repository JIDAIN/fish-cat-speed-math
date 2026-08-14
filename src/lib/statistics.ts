import { QuestionType, Subtype, TrainingSession } from "./types";

export type Rating = "优秀" | "良好" | "合格" | "继续加油";
export const RATING_VERSION = "2.0.0";

export interface RatingTarget {
  questionCount: number;
  passSeconds: number;
  goodSeconds: number;
  excellentSeconds: number;
  passAccuracy: number;
  goodAccuracy: number;
  excellentAccuracy: number;
}

const target = (
  questionCount: number,
  excellentSeconds: number,
  goodSeconds: number,
  passSeconds: number,
): RatingTarget => ({
  questionCount,
  excellentSeconds,
  goodSeconds,
  passSeconds,
  excellentAccuracy: 0.975,
  goodAccuracy: 0.95,
  passAccuracy: 0.9,
});

const TARGETS: Partial<Record<`${QuestionType}:${Subtype}`, RatingTarget>> = {
  "two_digit_add_subtract:standard": target(40, 80, 100, 120),
  "three_digit_add_subtract:standard": target(40, 120, 150, 180),
  "two_by_one_multiply:standard": target(40, 60, 75, 90),
  "two_by_two_multiply:standard": target(20, 120, 150, 180),
  "three_by_two_division:quotient_first": target(20, 40, 50, 60),
  "three_by_two_division:quotient_two": target(20, 180, 210, 240),
  "three_by_two_division:quotient_estimate_3_percent": target(20, 80, 100, 120),
  "multi_digit_division:quotient_two": target(20, 180, 210, 240),
  "multi_number_add_subtract:standard": target(20, 120, 150, 180),
  "fraction_percent_conversion:fraction_to_percent": target(40, 70, 85, 100),
  "fraction_percent_conversion:percent_to_fraction": target(40, 80, 95, 110),
  "fraction_comparison:comparison": target(40, 100, 120, 140),
  "special_two_by_two_multiply:special_two_by_two": target(20, 120, 150, 180),
  "special_hundred_scaling_division:hundred_scaling": target(20, 150, 180, 220),
};

/**
 * Returns the configured reference targets for a question type.
 * The displayed times refer to its standard set size; scoring scales them by count.
 */
export function ratingTarget(
  type: QuestionType,
  subtype: Subtype = "standard",
): RatingTarget {
  const configured = TARGETS[`${type}:${subtype}` as keyof typeof TARGETS];
  if (!configured)
    throw new Error(`Missing rating target for ${type}:${subtype}`);
  return configured;
}

export function subtypesForType(type: QuestionType): Subtype[] {
  if (type === "three_by_two_division")
    return ["quotient_first", "quotient_two", "quotient_estimate_3_percent"];
  if (type === "multi_digit_division") return ["quotient_two"];
  if (type === "fraction_percent_conversion")
    return ["fraction_to_percent", "percent_to_fraction"];
  if (type === "fraction_comparison") return ["comparison"];
  if (type === "special_two_by_two_multiply") return ["special_two_by_two"];
  if (type === "special_hundred_scaling_division") return ["hundred_scaling"];
  return ["standard"];
}

export function sessionMetrics(session: TrainingSession) {
  const correctCount = session.records.filter(
    (record) => record.isCorrect,
  ).length;
  const questionCount = session.questions.length;
  const accuracy = questionCount ? correctCount / questionCount : 0;
  const averageMs = questionCount ? session.accumulatedMs / questionCount : 0;

  return { correctCount, questionCount, accuracy, averageMs };
}

export type RatingStandard = {
  level: Exclude<Rating, "继续加油">;
  maxSeconds: number;
  minCorrect: number;
};

const requiredCorrect = (
  questionCount: number,
  accuracy: number,
  level: RatingStandard["level"],
) => {
  if (questionCount === 10 && (level === "良好" || level === "合格")) return 9;
  if (questionCount === 10 && level === "优秀") return 10;
  return Math.ceil(questionCount * accuracy);
};

export function ratingStandards(session: TrainingSession): RatingStandard[] {
  const configured = ratingTarget(session.questionType, session.subtype);
  const count = session.questions.length;
  const multiplier = count / configured.questionCount;
  return [
    {
      level: "优秀",
      maxSeconds: configured.excellentSeconds * multiplier,
      minCorrect: requiredCorrect(count, configured.excellentAccuracy, "优秀"),
    },
    {
      level: "良好",
      maxSeconds: configured.goodSeconds * multiplier,
      minCorrect: requiredCorrect(count, configured.goodAccuracy, "良好"),
    },
    {
      level: "合格",
      maxSeconds: configured.passSeconds * multiplier,
      minCorrect: requiredCorrect(count, configured.passAccuracy, "合格"),
    },
  ];
}

export function assessRating(session: TrainingSession) {
  const metrics = sessionMetrics(session);
  const seconds = session.accumulatedMs / 1000;
  const standards = ratingStandards(session);
  const standard = standards.find(
    (candidate) =>
      seconds <= candidate.maxSeconds &&
      metrics.correctCount >= candidate.minCorrect,
  );
  const level: Rating = standard?.level ?? "继续加油";
  const nextIndex =
    level === "良好"
      ? 0
      : level === "合格"
        ? 1
        : level === "继续加油"
          ? 2
          : undefined;
  const next = nextIndex === undefined ? undefined : standards[nextIndex];
  return {
    level,
    metrics,
    seconds,
    standards,
    next:
      next && next.level !== level
        ? {
            ...next,
            secondsShortfall: Math.max(0, seconds - next.maxSeconds),
            correctShortfall: Math.max(
              0,
              next.minCorrect - metrics.correctCount,
            ),
          }
        : undefined,
  };
}

export function createRatingSnapshot(session: TrainingSession) {
  const assessment = assessRating(session);
  return {
    version: RATING_VERSION,
    level: assessment.level,
    correctCount: assessment.metrics.correctCount,
    questionCount: assessment.metrics.questionCount,
    elapsedMs: session.accumulatedMs,
  };
}

/** New completions use a frozen snapshot; legacy history keeps its old dynamic display. */
export function getRating(session: TrainingSession): Rating {
  return session.rating?.level ?? assessRating(session).level;
}

export type HistorySummary = {
  sessionCount: number;
  questionCount: number;
  correctCount: number;
  accuracy: number;
  averageMs: number;
  latestRating?: Rating;
  bestRating?: Rating;
  ratingCounts: Record<Rating, number>;
};

const ratingOrder: Rating[] = ["优秀", "良好", "合格", "继续加油"];

/** Weighted summary: correctness and speed are calculated over all frozen questions. */
export function summarizeHistory(sessions: TrainingSession[]): HistorySummary {
  const completed = sessions
    .filter((session) => session.status === "completed")
    .sort((left, right) => right.startedAt - left.startedAt);
  const ratingCounts: Record<Rating, number> = {
    优秀: 0,
    良好: 0,
    合格: 0,
    继续加油: 0,
  };
  const totals = completed.reduce(
    (result, session) => {
      const metrics = sessionMetrics(session);
      const rating = getRating(session);
      ratingCounts[rating] += 1;
      return {
        questionCount: result.questionCount + metrics.questionCount,
        correctCount: result.correctCount + metrics.correctCount,
        elapsedMs: result.elapsedMs + session.accumulatedMs,
      };
    },
    { questionCount: 0, correctCount: 0, elapsedMs: 0 },
  );
  const ratings = completed.map(getRating);
  return {
    sessionCount: completed.length,
    questionCount: totals.questionCount,
    correctCount: totals.correctCount,
    accuracy: totals.questionCount
      ? totals.correctCount / totals.questionCount
      : 0,
    averageMs: totals.questionCount
      ? totals.elapsedMs / totals.questionCount
      : 0,
    latestRating: ratings[0],
    bestRating: ratingOrder.find((rating) => ratings.includes(rating)),
    ratingCounts,
  };
}

export function trendPoints(
  sessions: TrainingSession[],
  userId: string,
  type: QuestionType,
  subtype: Subtype,
  questionCount: number,
) {
  const matchingSessions = sessions
    .filter(
      (session) =>
        session.status === "completed" &&
        session.userId === userId &&
        session.questionType === type &&
        session.subtype === subtype &&
        // The frozen question set is authoritative for legacy records that
        // did not explicitly persist their selected questionCount.
        session.questions.length === questionCount,
    )
    .sort((a, b) => a.startedAt - b.startedAt);

  // Keep the whole history, but aggregate older/dense histories into a readable
  // number of time buckets. The bucket size naturally changes at 10/100/1000+
  // records, so a long-term curve stays useful on a mobile screen.
  const maxPoints =
    matchingSessions.length <= 20
      ? 20
      : matchingSessions.length <= 100
        ? 20
        : matchingSessions.length <= 500
          ? 25
          : 30;
  const bucketCount = Math.min(matchingSessions.length, maxPoints);

  return Array.from({ length: bucketCount }, (_, bucketIndex) => {
    // Proportional boundaries keep all buckets similarly sized. This avoids
    // a final chart point representing only one record in a dense history.
    const firstIndex = Math.floor(
      (bucketIndex * matchingSessions.length) / bucketCount,
    );
    const endIndex = Math.floor(
      ((bucketIndex + 1) * matchingSessions.length) / bucketCount,
    );
    const bucket = matchingSessions.slice(firstIndex, endIndex);
    const totalQuestions = bucket.reduce(
      (sum, session) => sum + session.questions.length,
      0,
    );
    const totalDurationMs = bucket.reduce(
      (sum, session) => sum + session.accumulatedMs,
      0,
    );
    const totalCorrect = bucket.reduce(
      (sum, session) => sum + sessionMetrics(session).correctCount,
      0,
    );
    const lastIndex = endIndex;

    return {
      label:
        bucket.length === 1
          ? `第${lastIndex}次`
          : `第${firstIndex + 1}–${lastIndex}次`,
      // A plotted value represents one training group's total effective time.
      // Dense histories are bucketed, so use the per-session mean rather than
      // the bucket total; otherwise larger buckets would look artificially slow.
      totalSeconds: Number(
        (bucket.length ? totalDurationMs / bucket.length / 1000 : 0).toFixed(1),
      ),
      accuracyPercent: totalQuestions
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0,
      sessionCount: bucket.length,
    };
  });
}
