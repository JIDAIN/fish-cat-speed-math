import { isImplementedSkillId } from "./implemented-skill-drills";
import { getSkillDefinition, isRegisteredSkillId } from "./skill-registry";
import {
  DifficultyBand,
  MasteryProfile,
  SkillId,
  TrainingSession,
} from "./types";

export const MASTERY_ENGINE_VERSION = "a-canonical-1.0.0";

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
};

/**
 * A层当前只使用R/C两类配置。D/S/F先保留为未来C层接口配置，
 * 但不会因为结构标签或过程步骤自动生成新的Mastery。
 */
export const MASTERY_PROFILE_CONFIG: Readonly<
  Record<MasteryProfile, MasteryProfileConfig>
> = Object.freeze({
  R: { windowSize: 30, minAccuracy: 0.97, medianMs: 1_500, p90Ms: 2_500 },
  C: { windowSize: 30, minAccuracy: 0.95, medianMs: 3_000, p90Ms: 5_000 },
  D: { windowSize: 30, minAccuracy: 0.92, medianMs: 2_500, p90Ms: 4_500 },
  S: { windowSize: 20, minAccuracy: 0.92, medianMs: 4_000, p90Ms: 7_000 },
  F: { windowSize: 20, minAccuracy: 0.9, medianMs: 10_000, p90Ms: 15_000 },
});

export const MASTERY_TIME_MULTIPLIER: Readonly<Record<DifficultyBand, number>> =
  Object.freeze({ L1: 0.8, L2: 1, L3: 1.3 });

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
  structureTags: string[];
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
  reason:
    | "sample_window_not_full"
    | "timing_data_missing"
    | "accuracy_below_target"
    | "speed_below_target"
    | "meets_target";
};

function percentile(values: number[], fraction: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

/**
 * 只把“正式A能力整题”计入Mastery。经典训练、结构标签和过程步骤都不
 * 做事后能力映射，从源头避免旧微叶子模型再次进入正式能力统计。
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
      const skillId = record.question.skillId;
      const difficultyBand =
        record.question.difficultyBand ?? session.difficultyBand;
      if (!difficultyBand || !isRegisteredSkillId(skillId)) continue;
      const definition = getSkillDefinition(skillId);
      attempts.push({
        skillId,
        difficultyBand,
        masteryProfile:
          record.question.masteryProfile ?? definition.masteryProfile,
        isCorrect: record.isCorrect,
        durationMs: Math.max(0, record.timeUsedMs),
        timingInterrupted: record.timingInterrupted ?? false,
        skipped: record.skipped ?? false,
        startedAt: session.startedAt,
        ordinal: ordinal++,
        structureTags: record.question.structureTags ?? [],
      });
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
  weakStructures: string[];
  sampleCount: number;
  requiredSampleCount: number;
};

export function recommendTraining(
  sessions: TrainingSession[],
  userId: string,
  limit = 2,
): TrainingRecommendation[] {
  const attempts = collectSkillAttempts(sessions, userId);
  const summaries = masteryMatrix(sessions, userId).filter((summary) =>
    isImplementedSkillId(summary.skillId),
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
          ? "正确率未达标，先补正确性"
          : summary.status === "speed_limited"
            ? "正确率已达标，但中位数或P90耗时仍偏慢"
            : `样本不足，继续补到最近${summary.requiredSampleCount}题再判掌握`,
      score: recommendationScore(summary),
      weakStructures: weakStructures(attempts, summary),
      sampleCount: summary.sampleCount,
      requiredSampleCount: summary.requiredSampleCount,
    }));
}

/** 当前日常混合只从真实完成过的8个A专项中取材。 */
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
