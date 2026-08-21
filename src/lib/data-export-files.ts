import * as XLSX from "xlsx";
import {
  DataExport,
  formatShanghaiIso,
  QuestionExportRow,
  MatchExportRow,
  TrainingExportRow,
} from "./data-export";

type Field = {
  key: string;
  label: string;
  type: string;
  unit: string;
  source: "原始" | "派生";
  emptyMeaning: string;
  limitation?: string;
};

const trainingFields: Field[] = [
  ["training_id", "训练 ID", "文本", "", "原始", "无"],
  [
    "training_source_raw",
    "训练来源（原始）",
    "文本",
    "",
    "原始",
    "旧记录缺失时为空",
  ],
  [
    "training_source_normalized",
    "训练来源（标准化）",
    "文本",
    "",
    "派生",
    "无",
  ],
  ["training_source_inferred", "来源是否推断", "布尔", "", "派生", "无"],
  ["question_type", "题型", "文本", "", "原始", "无"],
  ["subtype", "子模式", "文本", "", "原始", "无"],
  [
    "started_at_iso",
    "开始时间（ISO）",
    "文本",
    "ISO-8601",
    "原始",
    "旧记录异常时为空",
  ],
  [
    "started_at_ms",
    "开始时间（毫秒）",
    "数值",
    "ms",
    "原始",
    "旧记录异常时为空",
  ],
  [
    "completed_at_iso",
    "真实完成时间（ISO）",
    "文本",
    "ISO-8601",
    "原始",
    "旧记录或旧客户端未采集时为空",
    "不要用空值推断完成时间。",
  ],
  [
    "completed_at_ms",
    "真实完成时间（毫秒）",
    "数值",
    "ms",
    "原始",
    "旧记录或旧客户端未采集时为空",
  ],
  ["actual_question_count", "实际题量", "数值", "题", "派生", "无"],
  ["answered_question_count", "已答题量", "数值", "题", "派生", "无"],
  ["correct_question_count", "正确题数", "数值", "题", "派生", "无"],
  [
    "total_effective_ms",
    "总有效用时",
    "数值",
    "ms",
    "原始",
    "异常旧记录时为空",
  ],
  ["accuracy_ratio", "正确率", "数值", "0–1", "派生", "无"],
  [
    "average_question_ms",
    "平均单题有效用时",
    "数值",
    "ms",
    "派生",
    "题量为 0 或缺总用时时为空",
  ],
  [
    "median_question_ms",
    "单题有效用时中位数",
    "数值",
    "ms",
    "派生",
    "没有作答记录时为空",
  ],
  ["rating", "冻结训练等级", "文本", "", "原始", "旧记录没有冻结评级时为空"],
  ["generator_version", "生成规则版本", "文本", "", "原始", "无"],
  ["grading_version", "判题规则版本", "文本", "", "原始", "无"],
  ["rating_version", "评级规则版本", "文本", "", "原始", "无"],
].map(([key, label, type, unit, source, emptyMeaning, limitation]) => ({
  key,
  label,
  type,
  unit,
  source: source as Field["source"],
  emptyMeaning,
  limitation,
}));

const questionFields: Field[] = [
  ["training_id", "训练 ID", "文本", "", "原始", "无"],
  ["question_id", "题目 ID", "文本", "", "原始", "旧记录异常时为空"],
  ["question_index", "题目顺序", "数值", "从 1 开始", "派生", "无"],
  ["question_type", "题型", "文本", "", "原始", "旧记录异常时为空"],
  ["subtype", "子模式", "文本", "", "原始", "旧记录异常时为空"],
  ["prompt", "题面", "文本", "", "原始", "旧记录异常时为空"],
  ["correct_answer", "正确答案", "文本", "", "原始", "旧记录异常时为空"],
  [
    "user_answer",
    "用户答案",
    "文本",
    "",
    "原始",
    "无作答记录为真正空值；空字符串表示已有记录但答案为空；字符 0 保留为 0",
  ],
  ["answer_record_present", "存在作答记录", "布尔", "", "派生", "无"],
  ["is_correct", "是否正确", "布尔", "", "原始", "无作答记录时为空"],
  ["accuracy_level", "判定层级", "文本", "", "原始", "无作答记录时为空"],
  ["time_used_ms", "单题有效用时", "数值", "ms", "原始", "无作答记录时为空"],
  ["used_scratchpad", "使用草稿", "布尔", "", "原始", "无作答记录时为空"],
  [
    "restart_count",
    "旧版逐题重开次数",
    "数值",
    "次",
    "原始",
    "无作答记录时为空",
    "当前整组重开流程通常为 0。",
  ],
  ["difficulty_level", "难度等级", "数值", "1–5", "原始", "旧记录缺失时为空"],
  ["difficulty_tags_json", "难度标签 JSON", "文本", "JSON", "原始", "无"],
  [
    "primary_structure",
    "主结构",
    "文本",
    "",
    "原始",
    "旧记录可能为 legacy_unknown",
  ],
  ["secondary_tags_json", "辅助结构标签 JSON", "文本", "JSON", "原始", "无"],
  [
    "generation_rule_version",
    "题目生成规则版本",
    "文本",
    "",
    "原始",
    "旧记录缺失时为空",
  ],
  ["accepted_range_min", "接受范围下限", "数值", "", "原始", "不适用时为空"],
  ["accepted_range_max", "接受范围上限", "数值", "", "原始", "不适用时为空"],
  ["operand_a", "操作数 A", "文本/数值", "", "原始", "不适用时为空"],
  ["operand_b", "操作数 B", "文本/数值", "", "原始", "不适用时为空"],
  ["operand_c", "操作数 C", "文本/数值", "", "原始", "不适用时为空"],
  ["operand_d", "操作数 D", "文本/数值", "", "原始", "不适用时为空"],
  ["quotient", "真实商", "数值", "", "原始", "不适用时为空"],
  ["rule", "作答规则", "文本", "", "原始", "不适用时为空"],
  ["numerator", "分子", "数值", "", "原始", "不适用时为空"],
  ["denominator", "分母", "数值", "", "原始", "不适用时为空"],
  ["percent_answer", "百分数答案", "文本", "", "原始", "不适用时为空"],
  [
    "special_baseline",
    "专项整百基准",
    "数值",
    "",
    "原始",
    "非整百放缩专项时为空",
  ],
  [
    "relative_deviation",
    "相对偏差",
    "数值",
    "0–1",
    "原始",
    "非整百放缩专项时为空",
  ],
  [
    "correction_direction",
    "修正方向",
    "文本",
    "",
    "原始",
    "非整百放缩专项时为空",
  ],
  ["carry_load", "进位负荷", "数值", "", "原始", "非两位数乘法专项时为空"],
  ["question_data_json", "题目原始数据 JSON", "文本", "JSON", "原始", "无"],
].map(([key, label, type, unit, source, emptyMeaning, limitation]) => ({
  key,
  label,
  type,
  unit,
  source: source as Field["source"],
  emptyMeaning,
  limitation,
}));
const matchFields: Field[] = [
  ["record_id", "记录 ID", "文本", "", "原始", "无"],
  ["owner_role", "用户", "文本", "", "原始", "无"],
  ["training_source", "训练来源", "文本", "normal / pk", "原始", "无"],
  ["blueprint_fingerprint", "棋盘指纹", "文本", "", "原始", "无"],
  ["started_at_iso", "开始时间", "文本", "ISO-8601", "原始", "无"],
  ["started_at_ms", "开始时间（毫秒）", "数值", "ms", "原始", "无"],
  ["completed_at_iso", "完成时间", "文本", "ISO-8601", "原始", "无"],
  ["completed_at_ms", "完成时间（毫秒）", "数值", "ms", "原始", "无"],
  ["total_time_ms", "总用时", "数值", "ms", "原始", "无"],
  ["relation_count", "关系数量", "数值", "组", "原始", "无"],
  ["relation_set_version", "关系集版本", "文本", "", "原始", "无"],
  ["game_version", "游戏版本", "文本", "", "原始", "无"],
].map(([key, label, type, unit, source, emptyMeaning]) => ({
  key,
  label,
  type,
  unit,
  source: source as Field["source"],
  emptyMeaning,
}));

const formulaSafe = (value: unknown) =>
  typeof value === "string" && /^[=+\-@]/.test(value) ? `'${value}` : value;

function worksheet<T extends Record<string, unknown>>(
  rows: T[],
  fields: Field[],
) {
  const header = fields.map((field) => field.label);
  const body = rows.map((row) =>
    fields.map((field) => formulaSafe(row[field.key])),
  );
  return XLSX.utils.aoa_to_sheet([header, ...body]);
}

function styleSheet(sheet: XLSX.WorkSheet, fields: Field[]) {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range(range) };
  sheet["!cols"] = fields.map((field) => ({
    wch: Math.min(Math.max(field.label.length + 4, 14), 28),
  }));
  for (let column = 0; column <= range.e.c; column += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (cell)
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0F766E" } },
      };
  }
}

function applyColumnFormats(
  sheet: XLSX.WorkSheet,
  fields: Field[],
  formats: Record<string, string>,
) {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  fields.forEach((field, column) => {
    const format = formats[field.key];
    if (!format) return;
    for (let row = 1; row <= range.e.r; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      if (cell) cell.z = format;
    }
  });
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

export function createXlsxBlob(data: DataExport) {
  const workbook = XLSX.utils.book_new();
  const trainings = worksheet<TrainingExportRow>(
    data.trainings,
    trainingFields,
  );
  const questions = worksheet<QuestionExportRow>(
    data.questions,
    questionFields,
  );
  const matches = worksheet<MatchExportRow>(
    data.fraction_percent_match_history,
    matchFields,
  );
  const documentation = XLSX.utils.json_to_sheet(
    [...trainingFields, ...questionFields, ...matchFields].map((field) => ({
      字段名: field.key,
      中文名: field.label,
      类型: field.type,
      单位: field.unit,
      来源: field.source,
      空值含义: field.emptyMeaning,
      已知局限: field.limitation ?? "",
    })),
  );
  styleSheet(trainings, trainingFields);
  styleSheet(questions, questionFields);
  styleSheet(matches, matchFields);
  applyColumnFormats(trainings, trainingFields, {
    accuracy_ratio: "0.0%",
    started_at_ms: "0",
    completed_at_ms: "0",
    total_effective_ms: "0",
    average_question_ms: "0",
    median_question_ms: "0",
  });
  applyColumnFormats(questions, questionFields, {
    time_used_ms: "0",
  });
  documentation["!cols"] = [
    { wch: 30 },
    { wch: 26 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 45 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(workbook, trainings, "训练记录");
  XLSX.utils.book_append_sheet(workbook, questions, "逐题记录");
  XLSX.utils.book_append_sheet(workbook, matches, "消消乐历史");
  XLSX.utils.book_append_sheet(workbook, documentation, "字段说明");
  const bytes = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellStyles: true,
  });
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
