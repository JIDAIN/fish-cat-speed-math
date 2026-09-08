import readXlsxFile from "read-excel-file/universal";
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

function columnIndex(rows: unknown[][], label: string) {
  const index = rows[0]?.indexOf(label) ?? -1;
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("data export files", () => {
  it("creates readable sheets and a raw JSON archive", async () => {
    const data = createDataExport([row]);
    const blob = await createXlsxBlob(data);
    const book = await readXlsxFile(blob);
    expect(book.map((sheet) => sheet.sheet)).toEqual([
      "训练记录",
      "逐题记录",
      "消消乐历史",
      "字段说明",
    ]);

    const questionRows = book.find((sheet) => sheet.sheet === "逐题记录")!.data;
    expect(questionRows[1][columnIndex(questionRows, "题面")]).toBe("'=1+1");
    expect(questionRows[1][columnIndex(questionRows, "正确答案")]).toBe("'=2");
    expect(questionRows[1][columnIndex(questionRows, "能力 ID")]).toBeNull();

    const trainingRows = book.find((sheet) => sheet.sheet === "训练记录")!.data;
    const accuracyColumn = columnIndex(trainingRows, "正确率");
    expect(trainingRows[1][accuracyColumn]).toBe(1);
    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    const archive = JSON.parse(await createJsonBlob(data).text());
    expect(archive.raw_cloud_rows[0].completed_at).toBe("2026-01-01T00:00:00Z");
  });
});
