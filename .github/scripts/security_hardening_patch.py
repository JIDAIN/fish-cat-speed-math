from pathlib import Path

# Replace the vulnerable SheetJS writer with write-excel-file while preserving
# the existing export contract and workbook structure.
export_file = Path("src/lib/data-export-files.ts")
text = export_file.read_text()
text = text.replace(
    'import * as XLSX from "xlsx";\n',
    'import writeXlsxFile, { Cell, SheetData } from "write-excel-file/universal";\n',
    1,
)
start = text.index("const formulaSafe =")
end = text.index("export function downloadBlob", start)
replacement = r'''const formulaSafe = (value: unknown) =>
  typeof value === "string" && /^[=+\-@]/.test(value) ? `'${value}` : value;

function spreadsheetValue(value: unknown): Cell {
  const safe = formulaSafe(value);
  if (safe === null || safe === undefined) return null;
  if (
    typeof safe === "string" ||
    typeof safe === "number" ||
    typeof safe === "boolean" ||
    safe instanceof Date
  )
    return safe;
  return String(safe);
}

function headerCell(value: string): Cell {
  return {
    value,
    fontWeight: "bold",
    textColor: "#FFFFFF",
    backgroundColor: "#0F766E",
  };
}

function worksheet<T extends Record<string, unknown>>(
  rows: T[],
  fields: Field[],
  formats: Record<string, string> = {},
): SheetData {
  const header = fields.map((field) => headerCell(field.label));
  const body = rows.map((row) =>
    fields.map((field) => {
      const value = spreadsheetValue(row[field.key]);
      const format = formats[field.key];
      if (format && typeof value === "number") return { value, format };
      return value;
    }),
  );
  return [header, ...body];
}

function sheetColumns(fields: Field[]) {
  return fields.map((field) => ({
    width: Math.min(Math.max(field.label.length + 4, 14), 28),
  }));
}

export function exportFileBaseName(now = new Date()) {
  const china = formatShanghaiIso(now.getTime())!
    .replace(/[:.]/g, "-")
    .replace("+08:00", "+08-00");
  return `speed-math-personal-training-export_${china}`;
}

export function createJsonBlob(data: DataExport) {
  return new Blob([JSON.stringify(data.archive, null, 2)], {
    type: "application/json;charset=utf-8",
  });
}

export async function createXlsxBlob(data: DataExport) {
  const documentationFields: Field[] = [
    ["key", "字段名", "文本", "", "原始", "无"],
    ["label", "中文名", "文本", "", "原始", "无"],
    ["type", "类型", "文本", "", "原始", "无"],
    ["unit", "单位", "文本", "", "原始", "无"],
    ["source", "来源", "文本", "", "原始", "无"],
    ["emptyMeaning", "空值含义", "文本", "", "原始", "无"],
    ["limitation", "已知局限", "文本", "", "原始", "无"],
  ].map(([key, label, type, unit, source, emptyMeaning]) => ({
    key,
    label,
    type,
    unit,
    source: source as Field["source"],
    emptyMeaning,
  }));
  const documentationRows = [
    ...trainingFields,
    ...questionFields,
    ...matchFields,
  ].map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    unit: field.unit,
    source: field.source,
    emptyMeaning: field.emptyMeaning,
    limitation: field.limitation ?? "",
  }));

  const result = writeXlsxFile([
    {
      data: worksheet(data.trainings, trainingFields, {
        accuracy_ratio: "0.0%",
        started_at_ms: "0",
        completed_at_ms: "0",
        total_effective_ms: "0",
        average_question_ms: "0",
        median_question_ms: "0",
      }),
      sheet: "训练记录",
      columns: sheetColumns(trainingFields),
      stickyRowsCount: 1,
    },
    {
      data: worksheet(data.questions, questionFields, {
        relative_error: "0.000%",
        time_used_ms: "0",
      }),
      sheet: "逐题记录",
      columns: sheetColumns(questionFields),
      stickyRowsCount: 1,
    },
    {
      data: worksheet(data.fraction_percent_match_history, matchFields),
      sheet: "消消乐历史",
      columns: sheetColumns(matchFields),
      stickyRowsCount: 1,
    },
    {
      data: worksheet(documentationRows, documentationFields),
      sheet: "字段说明",
      columns: [
        { width: 30 },
        { width: 26 },
        { width: 14 },
        { width: 18 },
        { width: 12 },
        { width: 45 },
        { width: 45 },
      ],
      stickyRowsCount: 1,
    },
  ]);
  return result.toBlob();
}

'''
export_file.write_text(text[:start] + replacement + text[end:])

component = Path("src/components/PersonalDataExport.tsx")
text = component.read_text()
text = text.replace("      const xlsx = createXlsxBlob(data);", "      const xlsx = await createXlsxBlob(data);", 1)
component.write_text(text)

export_test = Path("src/lib/data-export-files.test.ts")
text = export_test.read_text()
text = text.replace(
    'import * as XLSX from "xlsx";\n',
    'import readXlsxFile from "read-excel-file/universal";\n',
    1,
)
old = '''    const book = XLSX.read(await (await createXlsxBlob(data)).arrayBuffer(), {
      type: "array",
      cellNF: true,
    });
    expect(book.SheetNames).toEqual([
      "训练记录",
      "逐题记录",
      "消消乐历史",
      "字段说明",
    ]);

    const questionWorksheet = book.Sheets["逐题记录"];
    const questionRows = XLSX.utils.sheet_to_json<unknown[]>(questionWorksheet, {
      header: 1,
    });
    expect(questionRows[1][columnIndex(questionRows, "题面")]).toBe("'=1+1");
    expect(questionRows[1][columnIndex(questionRows, "正确答案")]).toBe("'=2");
    expect(questionRows[1][columnIndex(questionRows, "能力 ID")]).toBeUndefined();

    const trainingWorksheet = book.Sheets["训练记录"];
    const trainingRows = XLSX.utils.sheet_to_json<unknown[]>(trainingWorksheet, {
      header: 1,
    });
    const accuracyColumn = columnIndex(trainingRows, "正确率");
    const accuracyCell = trainingWorksheet[
      XLSX.utils.encode_cell({ r: 1, c: accuracyColumn })
    ];
    expect(accuracyCell.z).toBe("0.0%");
'''
new = '''    const blob = await createXlsxBlob(data);
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
'''
assert old in text, "data export test block changed unexpectedly"
export_test.write_text(text.replace(old, new, 1))

perf = Path("src/lib/data-export.performance.test.ts")
text = perf.read_text()
old = '''    const [xlsx, json] = [createXlsxBlob(data), createJsonBlob(data)];
    const completed = performance.now();'''
new = '''    const [xlsx, json] = [await createXlsxBlob(data), createJsonBlob(data)];
    const completed = performance.now();'''
assert old in text, "performance export block changed unexpectedly"
perf.write_text(text.replace(old, new, 1))
