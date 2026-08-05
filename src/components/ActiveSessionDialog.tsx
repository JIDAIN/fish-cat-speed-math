"use client";

import React from "react";
import { typeLabels, TrainingSession } from "@/lib/types";

type ActiveSessionDialogProps = {
  session: TrainingSession;
  showCancel: boolean;
  onContinue: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  discardLabel?: string;
};

/** Choice dialog shown whenever a saved in-progress exercise exists. */
export function ActiveSessionDialog({
  session,
  showCancel,
  onContinue,
  onDiscard,
  onCancel,
  discardLabel,
}: ActiveSessionDialogProps) {
  return (
    <div className="modalBackdrop" role="presentation">
      <section
        aria-labelledby="active-session-title"
        aria-modal="true"
        className="activeSessionDialog"
        role="dialog"
      >
        <p>未完成训练</p>
        <h2 id="active-session-title">检测到一组暂存训练</h2>
        <span>
          {typeLabels[session.questionType]} · 第{session.currentIndex + 1}/
          {session.questions.length} 题
        </span>
        <small>未完成训练只保存在当前浏览器；完成后才会同步云端。</small>
        <button className="primary" onClick={onContinue}>
          继续原训练
        </button>
        <button onClick={onDiscard}>
          {discardLabel ?? (showCancel ? "放弃原训练并开始新的" : "放弃原训练")}
        </button>
        {showCancel && <button onClick={onCancel}>取消</button>}
      </section>
    </div>
  );
}
