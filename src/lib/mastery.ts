import { isImplementedSkillId } from "./implemented-skill-drills";
import {
  getSkillDefinition,
  isRegisteredSkillId,
} from "./skill-registry";
import {
  DifficultyBand,
  MasteryProfile,
  QuestionRecord,
  SkillId,
  TrainingSession,
} from "./types";

export const MASTERY_ENGINE_VERSION = "stage4-batch8-1.0.0";

export type MasteryStatus =
  | "insufficient"
  | "accuracy_first"
  | "speed_limited"
  | "mastered";

export type MasteryProfileConfig = {
  windowSize: number;
  minAccuracy: number;
  medianMs: number;
  p90Ms: number;
  criticalDecisionAccuracy?: number;
};

/**
 * V1 defaults come directly from the frozen training specification. They are
 * configuration, not permanent theory; later calibration can replace them
 * without changing the capability tree or historical raw records.
 */
export const MASTERY_PROFILE_CONFIG: Readonly<
  Record<MasteryProfile, MasteryProfileConfig>
> = Object.freeze({
  R: {
    windowSize: 30,
    minAccuracy: 0.97,
    medianMs: 1_500,
    p90Ms: 2_500,
  },
  C: {
    windowSize: 30,
    minAccuracy: 0.95,
    medianMs: 3_000,
    p90Ms: 5_000,
  },
  D: {
    windowSize: 30,
    minAccuracy: 0.92,
    medianMs: 2_500,
    p90Ms: 4_500,
  },
  S: {
    windowSize: 20,
    minAccuracy: 0.92,
    medianMs: 4_000,
    p90Ms: 7_000,
  },
  F: {
    windowSize: 20,
    minAccuracy: 0.9,
    criticalDecisionAccuracy: 0.9,
    medianMs: 10_000,
    p90Ms: 15_000,
  },
});

export const MASTERY_TIME_MULTIPLIER: Readonly<Record<DifficultyBand, number>> =
  Object.freeze({ L1: 0.8, L2: 1, L3: 1.3 });

type AttemptSource = "question" | "step";

export type SkillAttempt = {
  skillId: SkillId;
  difficultyBand: DifficultyBand;
  masteryProfile: MasteryProfile;
  isCorrect: boolean;
  durationMs: number;
  timingInterrupted: boolean;
  skipped: boolean;
  startedAt: number;
  ordinal: number;
  source: AttemptSource;
  structureTags: string[];
  secondarySkillIds: SkillId[];
  criticalDecisionCorrect?: boolean;
};

export type MasterySummary = {
  version: string;
  skillId: SkillId;
  difficultyBand: DifficultyBand;
  masteryProfile: MasteryProfile;
  status: MasteryStatus;
  sampleCount: number;
  requiredSampleCount: number;
  accuracy: number;
  minAccuracy: number;
  timedSampleCount: number;
  medianMs?: number;
  p90Ms?: number;
  maxMedianMs: number;
  maxP90Ms: number;
  criticalDecisionAccuracy?: number;
  minCriticalDecisionAccuracy?: number;
  reason:
    | "sample_window_not_full"
    | "timing_data_missing"
    | "accuracy_below_target"
    | "critical_decision_below_target"
    | "speed_below_target"
    | "meets_target";
};

function percentile(values: number[], fraction: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function criticalDecisionResult(record: QuestionRecord): boolean | undefined {
  const choiceStepIds = new Set(
    (record.question.stepSpecs ?? [])
      .filter((step) => step.inputKind === "choice")
      .map((step) => step.id),
  );
  if (!choiceStepIds.size) return undefined;
  const decisions = (record.steps ?? []).filter((step) =>
    choiceStepIds.has(step.stepId),
  );
  if (!decisions.length) return undefined;
  return decisions.every((step) => step.isCorrect);
}

function bandForRecord(
  session: TrainingSession,
  record: QuestionRecord,
): DifficultyBand | undefined {
  return record.question.difficultyBand ?? session.difficultyBand;
}

/**
 * Flattens completed history into capability attempts. Full-question attempts
 * measure the primary skill; structured substeps additionally feed their own
 * stepSkillId. A substep identical to the primary skill is skipped to avoid
 * double-counting one action twice.
 */
export function collectSkillAttempts(
  sessions: TrainingSession[],
  userId: string,
): SkillAttempt[] {
  const attempts: SkillAttempt[] = [];
  let ordinal = 0;
  const completed = sessions
    .filter(
      (session) => session.status === "completed" && session.userId === userId,
    )
    .sort((left, right) => left.startedAt - right.startedAt);

  for (const session of completed) {
    for (const record of session.records) {
      const band = bandForRecord(session, record);
      const primarySkillId = record.question.skillId;
      if (band && isRegisteredSkillId(primarySkillId)) {
        const definition = getSkillDefinition(primarySkillId);
        attempts.push({
          skillId: primarySkillId,
          difficultyBand: band,
          masteryProfile:
            record.question.masteryProfile ?? definition.masteryProfile,
          isCorrect: record.isCorrect,
          durationMs: Math.max(0, record.timeUsedMs),
          timingInterrupted: record.timingInterrupted ?? false,
          skipped: record.skipped ?? false,
          startedAt: session.startedAt,
          ordinal: ordinal++,
          source: "question",
          structureTags: record.question.structureTags ?? [],
          secondarySkillIds: (record.question.secondarySkillIds ?? []).filter(
            isRegisteredSkillId,
          ),
          criticalDecisionCorrect: criticalDecisionResult(record),
        });
      }

      for (const step of record.steps ?? []) {
        if (
          !band ||
          !isRegisteredSkillId(step.stepSkillId) ||
          step.stepSkillId === primarySkillId
        )
          continue;
        const definition = getSkillDefinition(step.stepSkillId);
        attempts.push({
          skillId: step.stepSkillId,
          difficultyBand: band,
          masteryProfile: definition.masteryProfile,
          isCorrect: step.isCorrect,
          durationMs: Math.max(0, step.durationMs),
          timingInterrupted: step.timingInterrupted,
          skipped: step.skipped,
          startedAt: session.startedAt,
          ordinal: ordinal++,
          source: "step",
          structureTags: record.question.structureTags ?? [],
          secondarySkillIds: [],
        });
      }
    }
  }

  return attempts;
}

export function summarizeSkillMastery(
  attempts: SkillAttempt[],
  skillId: SkillId,
  difficultyBand: DifficultyBand,
): MasterySummary {
  const definition = getSkillDefinition(skillId);
  const profile = definition.masteryProfile;
  const config = MASTERY_PROFILE_CONFIG[profile];
  const multiplier = MASTERY_TIME_MULTIPLIER[difficultyBand];
  const relevant = attempts
    .filter(
      (attempt) =>
        attempt.skillId === skillId &&
        attempt.difficultyBand === difficultyBand &&
        !attempt.skipped,
    )
    .sort(
      (left, right) =>
        left.startedAt - right.startedAt || left.ordinal - right.ordinal,
    );
  const window = relevant.slice(-config.windowSize);
  const accuracy = window.length
    ? window.filter((attempt) => attempt.isCorrect).length / window.length
    : 0;
  const timed = window.filter((attempt) => !attempt.timingInterrupted);
  const medianMs = percentile(
    timed.map((attempt) => attempt.durationMs),
    0.5,
  );
  const p90Ms = percentile(
    timed.map((attempt) => attempt.durationMs),
    0.9,
  );
  const critical = window.filter(
    (attempt) => attempt.criticalDecisionCorrect !== undefined,
  );
  const criticalDecisionAccuracy = critical.length
    ? critical.filter((attempt) => attempt.criticalDecisionCorrect).length /
      critical.length
    : undefined;
  const maxMedianMs = config.medianMs * multiplier;
  const maxP90Ms = config.p90Ms * multiplier;

  let status: MasteryStatus;
  let reason: MasterySummary["reason"];
  if (window.length < config.windowSize) {
    status = "insufficient";
    reason = "sample_window_not_full";
  } else if (!timed.length || medianMs === undefined || p90Ms === undefined) {
    status = "insufficient";
    reason = "timing_data_missing";
  } else if (accuracy < config.minAccuracy) {
    status = "accuracy_first";
    reason = "accuracy_below_target";
  } else if (
    profile === "F" &&
    config.criticalDecisionAccuracy !== undefined &&
    criticalDecisionAccuracy !== undefined &&
    criticalDecisionAccuracy < config.criticalDecisionAccuracy
  ) {
    status = "accuracy_first";
    reason = "critical_decision_below_target";
  } else if (medianMs > maxMedianMs || p90Ms > maxP90Ms) {
    status = "speed_limited";
    reason = "speed_below_target";
  } else {
    status = "mastered";
    reason = "meets_target";
  }

  return {
    version: MASTERY_ENGINE_VERSION,
    skillId,
    difficultyBand,
    masteryProfile: profile,
    status,
    sampleCount: window.length,
    requiredSampleCount: config.windowSize,
    accuracy,
    minAccuracy: config.minAccuracy,
    timedSampleCount: timed.length,
    medianMs,
    p90Ms,
    maxMedianMs,
    maxP90Ms,
    criticalDecisionAccuracy,
    minCriticalDecisionAccuracy: config.criticalDecisionAccuracy,
    reason,
  };
}

export function masteryMatrix(
  sessions: TrainingSession[],
  userId: string,
): MasterySummary[] {
  const attempts = collectSkillAttempts(sessions, userId);
  const keys = new Set(
    attempts.map(
      (attempt) => `${attempt.skillId}:${attempt.difficultyBand}` as const,
    ),
  );
  return [...keys]
    .map((key) => {
      const lastColon = key.lastIndexOf(":");
      return summarizeSkillMastery(
        attempts,
        key.slice(0, lastColon) as SkillId,
        key.slice(lastColon + 1) as DifficultyBand,
      );
    })
    .sort((left, right) =>
      `${left.skillId}:${left.difficultyBand}`.localeCompare(
        `${right.skillId}:${right.difficultyBand}`,
      ),
    );
}

function recommendationScore(summary: MasterySummary) {
  if (summary.status === "accuracy_first")
    return 300 + Math.max(0, summary.minAccuracy - summary.accuracy) * 1_000;
  if (summary.status === "speed_limited") {
    const medianRatio = summary.medianMs
      ? summary.medianMs / summary.maxMedianMs
      : 1;
    const p90Ratio = summary.p90Ms ? summary.p90Ms / summary.maxP90Ms : 1;
    return 200 + Math.max(medianRatio, p90Ratio) * 10;
  }
  if (summary.status === "insufficient")
    return 100 + summary.sampleCount / Math.max(1, summary.requiredSampleCount);
  return 0;
}

function diagnosticTargets(
  attempts: SkillAttempt[],
  summary: MasterySummary,
): SkillId[] {
  const definition = getSkillDefinition(summary.skillId);
  const counts = new Map<SkillId, number>();
  for (const target of definition.diagnosticTargets) {
    if (isImplementedSkillId(target) && target !== summary.skillId)
      counts.set(target, (counts.get(target) ?? 0) + 5);
  }
  for (const attempt of attempts) {
    if (
      attempt.skillId !== summary.skillId ||
      attempt.difficultyBand !== summary.difficultyBand ||
      attempt.isCorrect
    )
      continue;
    for (const target of attempt.secondarySkillIds) {
      if (isImplementedSkillId(target) && target !== summary.skillId)
        counts.set(target, (counts.get(target) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([skillId]) => skillId);
}

function weakStructures(
  attempts: SkillAttempt[],
  summary: MasterySummary,
): string[] {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    if (
      attempt.skillId !== summary.skillId ||
      attempt.difficultyBand !== summary.difficultyBand ||
      attempt.isCorrect
    )
      continue;
    for (const tag of attempt.structureTags)
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([tag]) => tag);
}

export type TrainingRecommendation = {
  skillId: SkillId;
  difficultyBand: DifficultyBand;
  status: MasteryStatus;
  reason: string;
  score: number;
  diagnosticTargets: SkillId[];
  weakStructures: string[];
  sampleCount: number;
  requiredSampleCount: number;
};

/**
 * Returns at most 1–2 actionable targets, matching the V1 rule that diagnosis
 * should not change too many variables at once. Mastered skills are never
 * recommended. If no full mastery window exists yet, the closest-to-full data
 * tracks are surfaced as data-collection targets rather than fake weaknesses.
 */
export function recommendTraining(
  sessions: TrainingSession[],
  userId: string,
  limit = 2,
): TrainingRecommendation[] {
  const attempts = collectSkillAttempts(sessions, userId);
  const summaries = masteryMatrix(sessions, userId).filter(
    (summary) => isImplementedSkillId(summary.skillId),
  );
  const actionable = summaries.filter(
    (summary) =>
      summary.status === "accuracy_first" || summary.status === "speed_limited",
  );
  const pool = actionable.length
    ? actionable
    : summaries.filter((summary) => summary.status === "insufficient");

  return pool
    .sort(
      (left, right) =>
        recommendationScore(right) - recommendationScore(left) ||
        right.sampleCount - left.sampleCount,
    )
    .slice(0, Math.max(0, Math.min(2, limit)))
    .map((summary) => ({
      skillId: summary.skillId,
      difficultyBand: summary.difficultyBand,
      status: summary.status,
      reason:
        summary.status === "accuracy_first"
          ? "正确率或关键决策未达标，先补正确性"
          : summary.status === "speed_limited"
            ? "正确率已达标，但中位数或P90耗时仍偏慢"
            : `样本不足，继续补到最近${summary.requiredSampleCount}题再判掌握`,
      score: recommendationScore(summary),
      diagnosticTargets: diagnosticTargets(attempts, summary),
      weakStructures: weakStructures(attempts, summary),
      sampleCount: summary.sampleCount,
      requiredSampleCount: summary.requiredSampleCount,
    }));
}

/** Skills that have actually appeared in completed history and can be mixed. */
export function learnedImplementedSkillIds(
  sessions: TrainingSession[],
  userId: string,
): SkillId[] {
  const seen = new Set(
    collectSkillAttempts(sessions, userId)
      .map((attempt) => attempt.skillId)
      .filter(isImplementedSkillId),
  );
  return [...seen].sort();
}
