import { describe, expect, it } from "vitest";
import { CloudCompletedTrainingRow } from "./cloud";
import { createDataExport } from "./data-export";
import { createJsonBlob, createXlsxBlob } from "./data-export-files";

describe("data export performance (manual verification)", () => {
  it("converts and generates 30,000 question rows", async () => {
    const sessions: CloudCompletedTrainingRow[] = Array.from(
      { length: 1000 },
      (_, sessionIndex) => ({
        session_id: `session-${sessionIndex}`,
        owner_id: "owner",
        owner_role: "fish",
        question_type: "two_digit_add_subtract",
        subtype: "standard",
        question_count: 30,
        generator_version: "2.6.0",
        grading_version: "1.0.0",
        rating_version: "2.0.0",
        schema_version: 1,
        completed_at: "2026-01-01T00:00:00Z",
        real_completed_at: "2026-01-01T00:01:00Z",
        created_at: "2026-01-01T00:02:00Z",
        session_data: {
          id: `session-${sessionIndex}`,
          trainingSource: "normal",
          questionType: "two_digit_add_subtract",
          subtype: "standard",
          startedAt: sessionIndex,
          completedAt: sessionIndex + 1000,
          accumulatedMs: 30000,
          questions: Array.from({ length: 30 }, (_, questionIndex) => ({
            id: `q-${sessionIndex}-${questionIndex}`,
            type: "two_digit_add_subtract",
            subtype: "standard",
            prompt: "12+3",
            answer: "15",
            data: { a: 12, b: 3 },
            difficulty: { level: 2, tags: [] },
            primaryStructure: "single_carry_or_borrow",
            secondaryTags: [],
            generationRuleVersion: "2.6.0",
          })),
          records: Array.from({ length: 30 }, (_, questionIndex) => ({
            question: { id: `q-${sessionIndex}-${questionIndex}` },
            userAnswer: "15",
            isCorrect: true,
            accuracyLevel: "exact",
            timeUsedMs: 1000,
            usedScratchpad: false,
            restartCount: 0,
          })),
        },
      }),
    );
    const started = performance.now();
    const data = createDataExport(sessions);
    const transformed = performance.now();
    const [xlsx, json] = [createXlsxBlob(data), createJsonBlob(data)];
    const completed = performance.now();
    console.info(
      `[data-export-performance] 1000 trainings, ${data.questions.length} questions; transform=${Math.round(transformed - started)}ms; file=${Math.round(completed - transformed)}ms; xlsx=${xlsx.size}; json=${json.size}`,
    );
    expect(data.questions).toHaveLength(30000);
    expect(xlsx.size).toBeGreaterThan(0);
    expect(json.size).toBeGreaterThan(0);
  }, 30000);
});
