import { describe, expect, it } from "vitest";
import { CloudCompletedTrainingRow } from "./cloud";
import { createDataExport, formatShanghaiIso } from "./data-export";

const row = (
  overrides: Partial<CloudCompletedTrainingRow> = {},
): CloudCompletedTrainingRow => ({
  session_id: "session-1",
  owner_id: "owner-1",
  owner_role: "fish",
  question_type: "three_by_two_division",
  subtype: "quotient_estimate_3_percent",
  question_count: 2,
  generator_version: "2.6.0",
  grading_version: "1.0.0",
  rating_version: "2.0.0",
  schema_version: 1,
  completed_at: "2026-08-01T00:00:00Z",
  real_completed_at: "2026-08-01T00:01:00Z",
  created_at: "2026-08-01T00:02:00Z",
  session_data: {
    id: "session-1",
    questionType: "three_by_two_division",
    subtype: "quotient_estimate_3_percent",
    startedAt: 1000,
    completedAt: 2000,
    accumulatedMs: 900,
    rating: { level: "优秀" },
    trainingSource: "pk",
    unknownFutureField: { retained: true },
    questions: [
      {
        id: "q1",
        type: "three_by_two_division",
        subtype: "quotient_estimate_3_percent",
        prompt: "=danger",
        answer: "10",
        data: {
          a: 100,
          b: 10,
          quotient: 10,
          rule: "quotient_estimate_3_percent",
        },
        acceptedRange: { min: 9.7, max: 10.3 },
        difficulty: { level: 4, tags: ["除法"] },
        primaryStructure: "near_estimate_boundary",
        secondaryTags: [],
        generationRuleVersion: "2.6.0",
      },
      {
        id: "q2",
        type: "three_by_two_division",
        subtype: "quotient_estimate_3_percent",
        prompt: "2÷2",
        answer: "1",
        data: {},
        difficulty: { level: 1, tags: [] },
        primaryStructure: "x",
        secondaryTags: [],
        generationRuleVersion: "2.6.0",
      },
    ],
    records: [
      {
        question: { id: "q1" },
        userAnswer: "0",
        isCorrect: true,
        accuracyLevel: "accepted",
        timeUsedMs: 900,
        usedScratchpad: true,
        restartCount: 0,
      },
    ],
  },
  ...overrides,
});

describe("data export conversion", () => {
  it("uses the documented +08:00 ISO representation without changing epoch values", () => {
    expect(formatShanghaiIso(0)).toBe("1970-01-01T08:00:00.000+08:00");
    const result = createDataExport([row()], 0);
    expect(result.archive.export_metadata.exported_at_iso).toBe(
      "1970-01-01T08:00:00.000+08:00",
    );
  });

  it("retains raw rows and maps PK training plus every frozen question", () => {
    const result = createDataExport([row()], 3_000);
    expect(result.trainings[0]).toMatchObject({
      training_source_raw: "pk",
      training_source_normalized: "pk",
      training_source_inferred: false,
      completed_at_ms: 2000,
      median_question_ms: 900,
    });
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatchObject({
      user_answer: "0",
      accuracy_level: "accepted",
      accepted_range_min: 9.7,
      used_scratchpad: true,
    });
    expect(result.questions[1]).toMatchObject({
      answer_record_present: false,
      user_answer: null,
      is_correct: null,
    });
    expect(result.archive.raw_cloud_rows[0].session_data).toMatchObject({
      unknownFutureField: { retained: true },
    });
  });

  it("marks missing training source as inferred without erasing raw absence", () => {
    const session = { ...row().session_data };
    delete session.trainingSource;
    const result = createDataExport([row({ session_data: session })]);
    expect(result.trainings[0]).toMatchObject({
      training_source_raw: null,
      training_source_normalized: "normal",
      training_source_inferred: true,
    });
    expect(result.warnings[0].code).toBe("inferred_training_source");
  });
});
