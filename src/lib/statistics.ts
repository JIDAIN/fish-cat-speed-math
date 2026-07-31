import { QuestionType, Subtype, TrainingSession } from "./types";

export type Rating = "优秀" | "良好" | "合格" | "继续加油";

export interface RatingTarget {
  questionCount: number;
  passSeconds: number;
  goodSeconds: number;
  excellentSeconds: number;
  passAccuracy: number;
  goodAccuracy: number;
  excellentAccuracy: number;
}

const DEFAULT_TARGET: RatingTarget = {
  questionCount: 20,
  passSeconds: 150,
  goodSeconds: 110,
  excellentSeconds: 80,
  passAccuracy: 0.9,
  goodAccuracy: 0.95,
  excellentAccuracy: 0.95,
};

const TARGETS: Partial<Record<QuestionType, RatingTarget>> = {
  two_digit_add_subtract: {
    ...DEFAULT_TARGET,
    passSeconds: 90,
    goodSeconds: 70,
    excellentSeconds: 50,
  },
  three_digit_add_subtract: {
    ...DEFAULT_TARGET,
    passSeconds: 180,
    goodSeconds: 140,
    excellentSeconds: 105,
  },
  two_by_one_multiply: {
    ...DEFAULT_TARGET,
    passSeconds: 60,
    goodSeconds: 48,
    excellentSeconds: 36,
  },
  two_by_two_multiply: {
    ...DEFAULT_TARGET,
    questionCount: 10,
    passSeconds: 120,
    goodSeconds: 90,
    excellentSeconds: 65,
    goodAccuracy: 0.9,
  },
  multi_digit_division: {
    ...DEFAULT_TARGET,
    questionCount: 10,
    passSeconds: 120,
    goodSeconds: 90,
    excellentSeconds: 65,
    goodAccuracy: 0.9,
  },
  multi_number_add_subtract: {
    ...DEFAULT_TARGET,
    questionCount: 10,
    passSeconds: 120,
    goodSeconds: 90,
    excellentSeconds: 65,
  },
  fraction_percent_conversion: {
    ...DEFAULT_TARGET,
    passSeconds: 150,
    goodSeconds: 110,
    excellentSeconds: 80,
  },
  fraction_comparison: {
    ...DEFAULT_TARGET,
    passSeconds: 120,
    goodSeconds: 85,
    excellentSeconds: 60,
  },
};

/**
 * Returns the configured reference targets for a question type.
 * The displayed times refer to its standard set size; scoring scales them by count.
 */
export function ratingTarget(type: QuestionType): RatingTarget {
  return TARGETS[type] ?? DEFAULT_TARGET;
}

export function subtypesForType(type: QuestionType): Subtype[] {
  if (type === "three_by_two_division")
    return ["quotient_first", "quotient_two"];
  if (type === "multi_digit_division") return ["quotient_two"];
  if (type === "fraction_percent_conversion")
    return ["fraction_to_percent", "percent_to_fraction"];
  if (type === "fraction_comparison") return ["comparison"];
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

/** Scales the configured 10- or 20-question time targets to the chosen set size. */
export function getRating(session: TrainingSession): Rating {
  const target = ratingTarget(session.questionType);
  const multiplier = session.questions.length / target.questionCount;
  const { accuracy } = sessionMetrics(session);
  const seconds = session.accumulatedMs / 1000;

  if (
    accuracy >= target.excellentAccuracy &&
    seconds <= target.excellentSeconds * multiplier
  )
    return "优秀";
  if (
    accuracy >= target.goodAccuracy &&
    seconds <= target.goodSeconds * multiplier
  )
    return "良好";
  if (
    accuracy >= target.passAccuracy &&
    seconds <= target.passSeconds * multiplier
  )
    return "合格";
  return "继续加油";
}

export function trendPoints(
  sessions: TrainingSession[],
  userId: string,
  type: QuestionType,
  subtype: Subtype,
) {
  const matchingSessions = sessions
    .filter(
      (session) =>
        session.status === "completed" &&
        session.userId === userId &&
        session.questionType === type &&
        session.subtype === subtype,
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
      averageSeconds: Number(
        (totalQuestions ? totalDurationMs / totalQuestions / 1000 : 0).toFixed(
          1,
        ),
      ),
      accuracyPercent: totalQuestions
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0,
      sessionCount: bucket.length,
    };
  });
}
