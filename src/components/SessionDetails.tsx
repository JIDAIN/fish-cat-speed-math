"use client";

import { useState } from "react";
import { ScratchCanvas } from "@/components/ScratchCanvas";
import { getRating, sessionMetrics } from "@/lib/statistics";
import {
  GeneratedQuestion,
  TrainingSession,
  subtypeLabels,
  typeLabels,
} from "@/lib/types";

function correctAnswerForReview(question: GeneratedQuestion) {
  if (
    question.type === "three_by_two_division" &&
    question.subtype === "quotient_estimate_3_percent" &&
    typeof question.data.quotient === "number"
  ) {
    return question.data.quotient.toFixed(2);
  }

  return question.answer;
}

export function SessionSummary({ session }: { session: TrainingSession }) {
  const metrics = sessionMetrics(session);
  return (
    <>
      <p className="sessionSubtitle">
        {typeLabels[session.questionType]} · {subtypeLabels[session.subtype]}
      </p>
      <div className="metrics">
        <b>
          {metrics.correctCount}/{metrics.questionCount}
          <small>正确题数</small>
        </b>
        <b>
          {(session.accumulatedMs / 1000).toFixed(1)}s<small>总用时</small>
        </b>
        <b>
          {(metrics.averageMs / 1000).toFixed(1)}s<small>平均每题</small>
        </b>
      </div>
      <p className="rating">
        本次评级：<strong>{getRating(session)}</strong>
      </p>
    </>
  );
}

/** A fixed column layout keeps the submitted answer and the frozen correct result separate. */
export function QuestionDetails({ session }: { session: TrainingSession }) {
  const [scratchOpen, setScratchOpen] = useState(false);

  return (
    <section className="questionDetails">
      <div className="questionDetailsHeader">
        <h2>题目明细</h2>
        <button
          aria-label="打开复盘草稿"
          className="reviewScratchButton"
          onClick={() => setScratchOpen(true)}
        >
          ✎ 草稿
        </button>
      </div>
      <div className="questionTableHead" aria-hidden="true">
        <span>题号</span>
        <span>题目</span>
        <span>作答</span>
        <span>判定</span>
        <span>正确结果</span>
        <span>用时</span>
      </div>
      <ol className="questionRows">
        {session.records.map((record, index) => (
          <li
            className={
              record.isCorrect ? "questionRow correct" : "questionRow incorrect"
            }
            key={record.question.id}
          >
            <span>{index + 1}</span>
            <span>{record.question.prompt}</span>
            <span>{record.userAnswer || "—"}</span>
            <span>{record.isCorrect ? "✓" : "×"}</span>
            <span>{correctAnswerForReview(record.question)}</span>
            <span>{(record.timeUsedMs / 1000).toFixed(1)}s</span>
          </li>
        ))}
      </ol>
      {scratchOpen && <ScratchCanvas onClose={() => setScratchOpen(false)} />}
    </section>
  );
}

export function SessionDetails({ session }: { session: TrainingSession }) {
  return (
    <>
      <SessionSummary session={session} />
      <QuestionDetails session={session} />
    </>
  );
}
