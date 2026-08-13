"use client";

import { useState } from "react";
import { CloudIdentity, readOwnCompletedTrainingForExport } from "@/lib/cloud";
import { createDataExport } from "@/lib/data-export";
import {
  createJsonBlob,
  createXlsxBlob,
  downloadBlob,
  exportFileBaseName,
} from "@/lib/data-export-files";

export function PersonalDataExport({ identity }: { identity?: CloudIdentity }) {
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);
  const exportData = async () => {
    if (!identity) {
      setStatus("请先登录已绑定的同步账号后导出。");
      return;
    }
    setBusy(true);
    try {
      const rows = await readOwnCompletedTrainingForExport(
        identity.id,
        ({ page, recordCount }) =>
          setStatus(`正在读取第 ${page} 页，已读取 ${recordCount} 条训练…`),
      );
      setStatus("正在整理并生成 XLSX 和 JSON 文件…");
      const data = createDataExport(rows);
      const xlsx = createXlsxBlob(data);
      const json = createJsonBlob(data);
      const base = exportFileBaseName();
      downloadBlob(xlsx, `${base}.xlsx`);
      downloadBlob(json, `${base}.json`);
      setStatus(
        rows.length
          ? `导出完成：${rows.length} 条云端训练。`
          : "导出完成：当前没有云端已同步的完成训练。",
      );
    } catch (error) {
      setStatus(
        `导出失败：${error instanceof Error ? error.message : "无法完整读取或生成文件"}`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="personalDataExport" aria-label="个人训练数据导出">
      <h2>导出个人训练数据</h2>
      <p>
        仅导出本人云端已同步的完成训练，包含普通和 PK
        练习；不含本地未同步记录、对手、胜负或挑战数据。
      </p>
      <button
        className="primary"
        disabled={busy || !identity}
        onClick={() => void exportData()}
      >
        {busy ? "正在导出…" : "导出 XLSX 和 JSON"}
      </button>
      {!identity && <small>请先登录已绑定的同步账号。</small>}
      {status && <p role="status">{status}</p>}
    </section>
  );
}
