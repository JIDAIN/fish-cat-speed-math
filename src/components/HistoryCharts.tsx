"use client";

import { useEffect, useMemo, useState } from "react";
import {
  QuestionType,
  Subtype,
  TrainingSession,
  subtypeLabels,
  typeLabels,
} from "@/lib/types";
import { ratingTarget, subtypesForType, trendPoints } from "@/lib/statistics";
import { TrendChart } from "./TrendChart";

const USERS = [
  { id: "fish", label: "🐟 小鱼" },
  { id: "cat", label: "🐱 小猫" },
] as const;

function TargetHeader({ type }: { type: QuestionType }) {
  const target = ratingTarget(type);
  return (
    <p className="targetHeader">
      {target.questionCount}题目标：优秀 ≤ {target.excellentSeconds}s · 良好 ≤{" "}
      {target.goodSeconds}s · 合格 ≤ {target.passSeconds}s
    </p>
  );
}

function TrackCharts({
  sessions,
  type,
  subtype,
}: {
  sessions: TrainingSession[];
  type: QuestionType;
  subtype: Subtype;
}) {
  const questionCounts = useMemo(
    () =>
      [
        ...new Set(
          sessions
            .filter(
              (session) =>
                session.status === "completed" &&
                session.questionType === type &&
                session.subtype === subtype &&
                session.questions.length > 0,
            )
            .map((session) => session.questions.length),
        ),
      ].sort((left, right) => left - right),
    [sessions, subtype, type],
  );
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<
    number | undefined
  >(questionCounts.at(-1));

  useEffect(() => {
    if (!questionCounts.includes(selectedQuestionCount ?? -1))
      setSelectedQuestionCount(questionCounts.at(-1));
  }, [questionCounts, selectedQuestionCount]);

  const questionCount = selectedQuestionCount ?? questionCounts.at(-1);
  return (
    <section className="trackCharts">
      <div className="trackTitle">
        <h3>{typeLabels[type]}</h3>
        {subtype !== "standard" && <span>{subtypeLabels[subtype]}</span>}
      </div>
      <TargetHeader type={type} />
      {questionCount !== undefined && (
        <label className="trendCountPicker">
          <span>题量</span>
          <select
            aria-label={`${typeLabels[type]}题量趋势`}
            value={questionCount}
            onChange={(event) =>
              setSelectedQuestionCount(Number(event.target.value))
            }
          >
            {questionCounts.map((count) => (
              <option key={count} value={count}>
                {count}题
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="userChartGrid">
        {USERS.map((user) => {
          const points = questionCount
            ? trendPoints(sessions, user.id, type, subtype, questionCount)
            : [];
          const latest = points.at(-1);
          return (
            <article className="userChart" key={user.id}>
              <div className="userChartHeading">
                <strong>{user.label}</strong>
                <span>
                  {latest
                    ? `最近：${latest.averageSeconds}s / ${latest.accuracyPercent}%`
                    : "暂无记录"}
                </span>
              </div>
              <TrendChart points={points} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Renders all available question-type tracks independent of the current home-page selection. */
export function HistoryCharts({ sessions }: { sessions: TrainingSession[] }) {
  const questionTypes = Object.keys(typeLabels) as QuestionType[];
  return (
    <section className="historyCharts" aria-label="各题型成长趋势">
      <h2>成长趋势</h2>
      <p className="historyChartsHint">
        左右分别显示 🐟 和
        🐱；每条折线只比较同一题型、同一答题规则的训练。完整历史会自动按记录量汇总，方便查看长期变化。
      </p>
      {questionTypes.flatMap((type) =>
        subtypesForType(type).map((subtype) => (
          <TrackCharts
            key={`${type}-${subtype}`}
            sessions={sessions}
            type={type}
            subtype={subtype}
          />
        )),
      )}
    </section>
  );
}
