from pathlib import Path

export_file = Path("src/lib/data-export-files.ts")
text = export_file.read_text()
old = '''import {
  DataExport,
  formatShanghaiIso,
  QuestionExportRow,
  MatchExportRow,
  TrainingExportRow,
} from "./data-export";'''
new = 'import { DataExport, formatShanghaiIso } from "./data-export";'
assert old in text, "hardened export import block changed unexpectedly"
export_file.write_text(text.replace(old, new, 1))
