import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { createDataExport } from "./data-export";
import { createJsonBlob, createXlsxBlob } from "./data-export-files";
import { CloudCompletedTrainingRow } from "./cloud";

const row: CloudCompletedTrainingRow = {
  session_id: "id-1",
  owner_id: "owner",
  owner_role: "fish",
  question_type: "two_digit_add_subtract",
  subtype: "standard",
  question_count: 1,
  generator_version: "g",
  grading_version: "v",
  rating_version: "r",
  schema_version: 1,
  completed_at: "2026-01-01T00:00:00Z",
  real_completed_at: null,
  created_at: "2026-01-01T00:00:01Z",
  session_data: {
    id: "id-1",
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    startedAt: 1,
    accumulatedMs: 10,
    questions: [
      {
        id: "q-1",
        type: "two_digit_add_subtract",
        subtype: "standard",
        prompt: "=1+1",
        answer: "=2",
        data: {},
        difficulty: { level: 1, tags: [] },
        primaryStructure: "x",
        secondaryTags: [],
        generationRuleVersion: "g",
      },
    ],
    records: [
      {
        question: { id: "q-1" },
        userAnswer: "=2",
        isCorrect: true,
        accuracyLevel: "exact",
        timeUsedMs: 10,
        usedScratchpad: false,
        restartCount: 0,
      },
    ],
  },
};

describe("data export files", () => {
  it("creates three readable sheets and a raw JSON archive", async () => {
    const data = createDataExport([row]);
    const book = XLSX.read(await (await createXlsxBlob(data)).arrayBuffer(), {
      type: "array",
      cellNF: true,
    });
    expect(book.SheetNames).toEqual([
      "训练记录",
      "逐题记录",
      "消消乐历史",
      "字段说明",
    ]);
    const questionSheet = XLSX.utils.sheet_to_json<unknown[]>(
      book.Sheets["逐题记录"],
      { header: 1 },
    );
    expect(questionSheet[1][5]).toBe("'=1+1");
    expect(questionSheet[1][6]).toBe("'=2");
    const trainingSheet = book.Sheets["训练记录"];
    expect(trainingSheet.O2.z).toBe("0.0%");
    const archive = JSON.parse(await createJsonBlob(data).text());
    expect(archive.raw_cloud_rows[0].completed_at).toBe("2026-01-01T00:00:00Z");
  });
});
