import { CloudCompletedTrainingRow } from "./cloud";

export const DATA_EXPORT_SCHEMA_VERSION = "1.0.0";

type Value = string | number | boolean | string[] | undefined;
type UnknownRecord = Record<string, unknown>;

export type TrainingExportRow = {
  training_id: string;
  training_source_raw: string | null;
  training_source_normalized: "normal" | "pk";
  training_source_inferred: boolean;
  question_type: string;
  subtype: string;
  started_at_ms: number | null;
  started_at_iso: string | null;
  completed_at_ms: number | null;
  completed_at_iso: string | null;
  actual_question_count: number;
  answered_question_count: number;
  correct_question_count: number;
  total_effective_ms: number | null;
  accuracy_ratio: number | null;
  average_question_ms: number | null;
  median_question_ms: number | null;
  rating: string | null;
  generator_version: string;
  grading_version: string;
  rating_version: string;
};

export type QuestionExportRow = {
  training_id: string;
  question_id: string | null;
  question_index: number;
  question_type: string | null;
  subtype: string | null;
  prompt: string | null;
  correct_answer: string | null;
  user_answer: string | null;
  answer_record_present: boolean;
  is_correct: boolean | null;
  accuracy_level: string | null;
  time_used_ms: number | null;
  used_scratchpad: boolean | null;
  restart_count: number | null;
  difficulty_level: number | null;
  difficulty_tags_json: string;
  primary_structure: string | null;
  secondary_tags_json: string;
  generation_rule_version: string | null;
  accepted_range_min: number | null;
  accepted_range_max: number | null;
  operand_a: Value | null;
  operand_b: Value | null;
  operand_c: Value | null;
  operand_d: Value | null;
  quotient: Value | null;
  rule: Value | null;
  numerator: Value | null;
  denominator: Value | null;
  percent_answer: Value | null;
  question_data_json: string;
};

export type ExportWarning = {
  code: string;
  training_id: string;
  message: string;
};

export type DataExport = {
  trainings: TrainingExportRow[];
  questions: QuestionExportRow[];
  warnings: ExportWarning[];
  archive: {
    export_metadata: Record<string, unknown>;
    raw_cloud_rows: CloudCompletedTrainingRow[];
    normalized_export: {
      trainings: TrainingExportRow[];
      questions: QuestionExportRow[];
    };
    warnings: ExportWarning[];
  };
};

const record = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
const string = (value: unknown) => (typeof value === "string" ? value : null);
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const boolean = (value: unknown) => (typeof value === "boolean" ? value : null);
const json = (value: unknown) => JSON.stringify(value ?? {});
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

/** A stable, locale-independent ISO representation for the product's +08:00 time zone. */
export function formatShanghaiIso(value: number | null) {
  if (value === null) return null;
  const shifted = new Date(value + SHANGHAI_OFFSET_MS);
  const pad = (part: number, length = 2) => String(part).padStart(length, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(
    shifted.getUTCSeconds(),
  )}.${pad(shifted.getUTCMilliseconds(), 3)}+08:00`;
}

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function createDataExport(
  rows: CloudCompletedTrainingRow[],
  exportedAt = Date.now(),
): DataExport {
  const trainings: TrainingExportRow[] = [];
  const questions: QuestionExportRow[] = [];
  const warnings: ExportWarning[] = [];

  for (const row of rows) {
    const session = record(row.session_data);
    const frozenQuestions = Array.isArray(session.questions)
      ? session.questions
      : [];
    const records = Array.isArray(session.records)
      ? session.records.map(record)
      : [];
    const recordsByQuestion = new Map(
      records.map((item) => [string(record(item.question).id), item]),
    );
    const rawSource = string(session.trainingSource);
    const sourceKnown = rawSource === "normal" || rawSource === "pk";
    if (rawSource && !sourceKnown)
      warnings.push({
        code: "unknown_training_source",
        training_id: row.session_id,
        message: `Unknown trainingSource: ${rawSource}`,
      });
    if (!rawSource)
      warnings.push({
        code: "inferred_training_source",
        training_id: row.session_id,
        message: "Missing trainingSource was normalized to normal.",
      });
    const normalized = rawSource === "pk" ? "pk" : "normal";
    const startedAt = number(session.startedAt);
    const completedAt = number(session.completedAt);
    const elapsed = number(session.accumulatedMs);
    const timeValues = records
      .map((item) => number(item.timeUsedMs))
      .filter((item): item is number => item !== null);
    const correct = records.filter(
      (item) => boolean(item.isCorrect) === true,
    ).length;
    const rating = string(record(session.rating).level);
    trainings.push({
      training_id: row.session_id,
      training_source_raw: rawSource,
      training_source_normalized: normalized,
      training_source_inferred: rawSource === null || !sourceKnown,
      question_type: string(session.questionType) ?? row.question_type,
      subtype: string(session.subtype) ?? row.subtype,
      started_at_ms: startedAt,
      started_at_iso: formatShanghaiIso(startedAt),
      completed_at_ms: completedAt,
      completed_at_iso: formatShanghaiIso(completedAt),
      actual_question_count: frozenQuestions.length,
      answered_question_count: records.length,
      correct_question_count: correct,
      total_effective_ms: elapsed,
      accuracy_ratio: frozenQuestions.length
        ? correct / frozenQuestions.length
        : null,
      average_question_ms:
        frozenQuestions.length && elapsed !== null
          ? elapsed / frozenQuestions.length
          : null,
      median_question_ms: median(timeValues),
      rating,
      generator_version: row.generator_version,
      grading_version: row.grading_version,
      rating_version: row.rating_version,
    });

    frozenQuestions.forEach((rawQuestion, index) => {
      const question = record(rawQuestion);
      const questionId = string(question.id);
      const answer = questionId ? recordsByQuestion.get(questionId) : undefined;
      const data = record(question.data);
      const accepted = record(question.acceptedRange);
      const difficulty = record(question.difficulty);
      questions.push({
        training_id: row.session_id,
        question_id: questionId,
        question_index: index + 1,
        question_type: string(question.type),
        subtype: string(question.subtype),
        prompt: string(question.prompt),
        correct_answer: string(question.answer),
        user_answer: answer ? string(answer.userAnswer) : null,
        answer_record_present: Boolean(answer),
        is_correct: answer ? boolean(answer.isCorrect) : null,
        accuracy_level: answer ? string(answer.accuracyLevel) : null,
        time_used_ms: answer ? number(answer.timeUsedMs) : null,
        used_scratchpad: answer ? boolean(answer.usedScratchpad) : null,
        restart_count: answer ? number(answer.restartCount) : null,
        difficulty_level: number(difficulty.level),
        difficulty_tags_json: json(difficulty.tags),
        primary_structure: string(question.primaryStructure),
        secondary_tags_json: json(question.secondaryTags),
        generation_rule_version: string(question.generationRuleVersion),
        accepted_range_min: number(accepted.min),
        accepted_range_max: number(accepted.max),
        operand_a: (data.a as Value) ?? null,
        operand_b: (data.b as Value) ?? null,
        operand_c: (data.c as Value) ?? null,
        operand_d: (data.d as Value) ?? null,
        quotient: (data.quotient as Value) ?? null,
        rule: (data.rule as Value) ?? null,
        numerator: (data.numerator as Value) ?? null,
        denominator: (data.denominator as Value) ?? null,
        percent_answer: (data.percentAnswer as Value) ?? null,
        question_data_json: json(data),
      });
    });
  }

  return {
    trainings,
    questions,
    warnings,
    archive: {
      export_metadata: {
        schema_version: DATA_EXPORT_SCHEMA_VERSION,
        exported_at_ms: exportedAt,
        exported_at_iso: formatShanghaiIso(exportedAt),
        time_zone: "Asia/Shanghai (+08:00)",
        scope: "Current authenticated owner cloud completed training only",
        note: "This is a machine-readable archive, not a verified restorable backup.",
        legacy_completed_at_note:
          "raw_cloud_rows.completed_at historically stores startedAt, not real completion time.",
        training_count: trainings.length,
        question_count: questions.length,
      },
      raw_cloud_rows: rows,
      normalized_export: { trainings, questions },
      warnings,
    },
  };
}
