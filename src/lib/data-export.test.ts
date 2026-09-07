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
  schema_version: 2,
  completed_at: "2026-08-01T00:00:00Z",
  real_completed_at: "2026-08-01T00:01:00Z",
  created_at: "2026-08-01T00:02:00Z",
  session_data: {
    id: "session-1",
    questionType: "three_by_two_division",
    subtype: "quotient_estimate_3_percent",
    schemaVersion: 2,
    trainingMode: "skill",
    primarySkillId: "C-DIV-01",
    difficultyBand: "L2",
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
        skillId: "C-DIV-01",
        secondarySkillIds: ["A-MAG-01"],
        difficultyBand: "L2",
        structureTags: ["near_estimate_boundary"],
        targetPrecision: "3%",
        masteryProfile: "F",
        inputKind: "number",
        generatorParams: { quotientBand: "1_to_10" },
        allowedAnswerSet: [],
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
        relativeError: 0.01,
        timeUsedMs: 900,
        submitCount: 1,
        editCount: 2,
        skipped: false,
        timingInterrupted: false,
        steps: [
          {
            stepId: "trial",
            stepSkillId: "C-DIV-06",
            stepType: "trial_quotient",
            userValue: 2,
            isCorrect: true,
            durationMs: 300,
            submitCount: 1,
            editCount: 0,
            skipped: false,
            timingInterrupted: false,
          },
        ],
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
      schema_version: 2,
      training_mode: "skill",
      primary_skill_id: "C-DIV-01",
      difficulty_band: "L2",
      completed_at_ms: 2000,
      median_question_ms: 900,
    });
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatchObject({
      skill_id: "C-DIV-01",
      difficulty_band: "L2",
      target_precision: "3%",
      mastery_profile: "F",
      user_answer: "0",
      accuracy_level: "accepted",
      relative_error: 0.01,
      submit_count: 1,
      edit_count: 2,
      timing_interrupted: false,
      accepted_range_min: 9.7,
      used_scratchpad: true,
    });
    expect(JSON.parse(result.questions[0].steps_json)).toMatchObject([
      { step_skill_id: undefined },
    ]);
    // Raw step JSON preserves the application's camelCase source shape.
    expect(JSON.parse(result.questions[0].steps_json)[0]).toMatchObject({
      stepSkillId: "C-DIV-06",
      durationMs: 300,
    });
    expect(result.questions[1]).toMatchObject({
      answer_record_present: false,
      user_answer: null,
      is_correct: null,
      skill_id: null,
    });
    expect(result.archive.raw_cloud_rows[0].session_data).toMatchObject({
      unknownFutureField: { retained: true },
    });
  });

  it("leaves legacy skill fields empty instead of inventing a mapping", () => {
    const legacy = row({
      schema_version: 1,
      session_data: {
        ...row().session_data,
        trainingMode: undefined,
        primarySkillId: undefined,
        difficultyBand: undefined,
        questions: [
          {
            id: "legacy-q",
            type: "three_by_two_division",
            subtype: "quotient_two",
            prompt: "10÷3",
            answer: "3.3",
            data: {},
            difficulty: { level: 3, tags: [] },
            primaryStructure: "legacy",
            secondaryTags: [],
            generationRuleVersion: "legacy",
          },
        ],
        records: [],
      },
    });
    const result = createDataExport([legacy]);
    expect(result.trainings[0]).toMatchObject({
      schema_version: 1,
      primary_skill_id: null,
      difficulty_band: null,
    });
    expect(result.questions[0]).toMatchObject({
      skill_id: null,
      difficulty_band: null,
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
