"use client";

import React, { useState } from "react";
import {
  QuestionCountMode,
  QUICK_QUESTION_COUNT,
  STANDARD_QUESTION_COUNT,
} from "@/lib/question-count";

export type QuestionCountSelection = {
  count: number;
  mode: QuestionCountMode;
};

type QuestionCountDialogProps = {
  initialCount: number;
  /** Retained for call-site compatibility while custom new sessions are retired. */
  lastCustomCount: number;
  onConfirm: (selection: QuestionCountSelection) => void;
  onCancel: () => void;
};

type NewQuestionCountMode = Exclude<QuestionCountMode, "custom">;

/**
 * V2 skill sessions deliberately offer only 10 or 20 questions. The storage
 * layer still accepts historical 30–100 question sessions separately.
 */
export function QuestionCountDialog({
  initialCount,
  onConfirm,
  onCancel,
}: QuestionCountDialogProps) {
  const [mode, setMode] = useState<NewQuestionCountMode>(
    initialCount === QUICK_QUESTION_COUNT ? "quick" : "standard",
  );
  const selectedCount =
    mode === "quick" ? QUICK_QUESTION_COUNT : STANDARD_QUESTION_COUNT;

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        aria-labelledby="question-count-title"
        aria-modal="true"
        className="questionCountDialog"
        role="dialog"
      >
        <header>
          <div>
            <p>训练设置</p>
            <h2 id="question-count-title">选择题量</h2>
          </div>
          <button aria-label="关闭题量选择" onClick={onCancel} type="button">
            ×
          </button>
        </header>

        <button
          className={mode === "quick" ? "countMode selected" : "countMode"}
          onClick={() => setMode("quick")}
          type="button"
        >
          <span>快速模式</span>
          <small>10题，适合专项和碎片时间</small>
        </button>
        <button
          className={mode === "standard" ? "countMode selected" : "countMode"}
          onClick={() => setMode("standard")}
          type="button"
        >
          <span>标准模式</span>
          <small>20题，日常训练上限</small>
        </button>

        <p className="questionCountHint">
          新训练固定为10题或20题；历史30～100题记录仍可正常查看和恢复。
        </p>

        <button
          className="primary"
          onClick={() => onConfirm({ count: selectedCount, mode })}
          type="button"
        >
          确定（{selectedCount}题）
        </button>
        <button onClick={onCancel} type="button">
          取消
        </button>
      </section>
    </div>
  );
}
