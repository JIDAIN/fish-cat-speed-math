"use client";

import React, { useState } from "react";
import {
  DEFAULT_CUSTOM_QUESTION_COUNT,
  modeForQuestionCount,
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
  lastCustomCount: number;
  onConfirm: (selection: QuestionCountSelection) => void;
  onCancel: () => void;
};

/**
 * Keeps an uncommitted local selection so closing the panel never changes the
 * home-page count by accident.
 */
export function QuestionCountDialog({
  initialCount,
  lastCustomCount,
  onConfirm,
  onCancel,
}: QuestionCountDialogProps) {
  const [mode, setMode] = useState<QuestionCountMode>(
    modeForQuestionCount(initialCount),
  );
  const [customCount, setCustomCount] = useState(lastCustomCount);
  const selectedCount =
    mode === "quick"
      ? QUICK_QUESTION_COUNT
      : mode === "standard"
        ? STANDARD_QUESTION_COUNT
        : customCount;

  const selectMode = (nextMode: QuestionCountMode) => {
    setMode(nextMode);
    if (nextMode === "custom" && !Number.isFinite(customCount)) {
      setCustomCount(DEFAULT_CUSTOM_QUESTION_COUNT);
    }
  };

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
          onClick={() => selectMode("quick")}
          type="button"
        >
          <span>快速模式</span>
          <small>10题，适合碎片时间</small>
        </button>
        <button
          className={mode === "standard" ? "countMode selected" : "countMode"}
          onClick={() => selectMode("standard")}
          type="button"
        >
          <span>标准模式</span>
          <small>20题，日常训练</small>
        </button>
        <button
          className={mode === "custom" ? "countMode selected" : "countMode"}
          onClick={() => selectMode("custom")}
          type="button"
        >
          <span>自定义模式</span>
          <small>10～100题，每次增加10题</small>
        </button>

        {mode === "custom" && (
          <label className="countRange">
            <span>
              题目数量 <strong>{customCount}题</strong>
            </span>
            <input
              aria-label="自定义题量"
              max="100"
              min="10"
              onChange={(event) => setCustomCount(Number(event.target.value))}
              step="10"
              type="range"
              value={customCount}
            />
            <small>
              <span>10题</span>
              <span>100题</span>
            </small>
          </label>
        )}

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
