"use client";

import { getRating, sessionMetrics } from "@/lib/statistics";
import { TrainingSession, subtypeLabels, typeLabels } from "@/lib/types";

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

/** A fixed column layout keeps question, answer, correction and time aligned. */
export function QuestionDetails({ session }: { session: TrainingSession }) {
  return (
    <section className="questionDetails">
      <h2>题目明细</h2>
      <div className="questionTableHead" aria-hidden="true">
        <span>题号</span>
        <span>题目</span>
        <span>作答</span>
        <span>判定</span>
        <span>用时</span>
        <span>重开</span>
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
            <span>
              {record.isCorrect ? "✓" : `× ${record.question.answer}`}
            </span>
            <span>{(record.timeUsedMs / 1000).toFixed(1)}s</span>
            <span>
              {record.restartCount ? `${record.restartCount}次` : "—"}
            </span>
          </li>
        ))}
      </ol>
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
