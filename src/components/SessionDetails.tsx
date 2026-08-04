"use client";

import { useState } from "react";
import { ScratchCanvas } from "@/components/ScratchCanvas";
import {
  assessRating,
  getRating,
  RATING_VERSION,
  sessionMetrics,
} from "@/lib/statistics";
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
        <small>
          评级版本：{session.rating?.version ?? "历史记录按当前规则展示"}
        </small>
      </p>
    </>
  );
}

const formatSeconds = (seconds: number) => `${seconds.toFixed(1)}秒`;

/** Reusable rating explanation for the result page and future PK presentation. */
export function RatingBreakdown({ session }: { session: TrainingSession }) {
  const assessment = assessRating(session);
  const level = getRating(session);
  return (
    <section className="ratingBreakdown" aria-label="等级评定说明">
      <p className="rating">
        本次等级：<strong>{level}</strong>
        <small>
          评级版本：{session.rating?.version ?? `当前规则 ${RATING_VERSION}`}
        </small>
      </p>
      <p>
        本次：{assessment.metrics.correctCount}/
        {assessment.metrics.questionCount}
        题正确（{Math.round(assessment.metrics.accuracy * 100)}%）· 总用时
        {formatSeconds(assessment.seconds)}
      </p>
      <ul>
        {assessment.standards.map((standard) => (
          <li key={standard.level}>
            {standard.level}：≤ {formatSeconds(standard.maxSeconds)} 且至少
            {standard.minCorrect}/{assessment.metrics.questionCount} 题正确
          </li>
        ))}
      </ul>
      {assessment.next ? (
        <p className="ratingGap">
          距离{assessment.next.level}：
          {assessment.next.secondsShortfall
            ? `速度还差 ${formatSeconds(assessment.next.secondsShortfall)}`
            : "速度已达标"}
          ；
          {assessment.next.correctShortfall
            ? `正确率还差 ${assessment.next.correctShortfall} 题`
            : "正确率已达标"}
        </p>
      ) : (
        <p className="ratingGap">已达到当前最高等级。</p>
      )}
    </section>
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
            <span className="questionNumber">{index + 1}</span>
            <span className="questionPrompt">{record.question.prompt}</span>
            <span className="questionAnswer">
              <small className="questionCellLabel">作答</small>
              {record.userAnswer || "—"}
            </span>
            <span className="questionVerdict">
              <small className="questionCellLabel">判定</small>
              {record.isCorrect ? "✓" : "×"}
            </span>
            <span className="questionCorrectResult">
              <small className="questionCellLabel">正确结果</small>
              {correctAnswerForReview(record.question)}
            </span>
            <span className="questionDuration">
              <small className="questionCellLabel">用时</small>
              {(record.timeUsedMs / 1000).toFixed(1)}s
            </span>
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
