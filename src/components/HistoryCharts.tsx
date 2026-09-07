"use client";

import { useEffect, useMemo, useState } from "react";
import {
  QuestionType,
  Subtype,
  TrainingSession,
  getSubtypeLabel,
  parseSkillDrillSubtype,
  typeLabels,
} from "@/lib/types";
import { getSkillDefinition, isRegisteredSkillId } from "@/lib/skill-registry";
import { ratingTarget, subtypesForType, trendPoints } from "@/lib/statistics";
import { TrendChart } from "./TrendChart";

const USERS = [
  { id: "fish", label: "🐟 小鱼" },
  { id: "cat", label: "🐱 小猫" },
] as const;

function skillTrackMeta(subtype: Subtype) {
  const parsed = parseSkillDrillSubtype(subtype);
  if (!parsed || !isRegisteredSkillId(parsed.skillId)) return undefined;
  return {
    ...parsed,
    definition: getSkillDefinition(parsed.skillId),
  };
}

function TargetHeader({
  type,
  subtype,
}: {
  type: QuestionType;
  subtype: Subtype;
}) {
  if (type === "skill_drill") {
    const skill = skillTrackMeta(subtype);
    return (
      <p className="targetHeader">
        {skill
          ? `${skill.definition.displayName} · ${skill.difficultyBand}：按能力 ID 单独累计正确率与耗时，不套用旧题型评级。`
          : "专项能力训练：按能力 ID 单独累计正确率与耗时，不套用旧题型评级。"}
      </p>
    );
  }

  const target = ratingTarget(type, subtype);
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
  const skill = type === "skill_drill" ? skillTrackMeta(subtype) : undefined;
  const trackTitle = skill?.definition.displayName ?? typeLabels[type];
  const availableQuestionCounts = useMemo(
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
  const defaultQuestionCount =
    type === "skill_drill" ||
    type === "fraction_percent_conversion" ||
    type === "fraction_comparison"
      ? 10
      : 20;
  const questionCounts = useMemo(
    () =>
      [...new Set([defaultQuestionCount, ...availableQuestionCounts])].sort(
        (left, right) => left - right,
      ),
    [availableQuestionCounts, defaultQuestionCount],
  );
  const [selectedQuestionCount, setSelectedQuestionCount] =
    useState(defaultQuestionCount);

  useEffect(() => {
    if (!questionCounts.includes(selectedQuestionCount))
      setSelectedQuestionCount(defaultQuestionCount);
  }, [defaultQuestionCount, questionCounts, selectedQuestionCount]);

  const questionCount = selectedQuestionCount;
  return (
    <section className="trackCharts">
      <div className="trackTitle">
        <h3>{trackTitle}</h3>
        {type === "skill_drill" ? (
          <span>
            {skill
              ? `${skill.skillId} · ${skill.difficultyBand}`
              : getSubtypeLabel(type, subtype)}
          </span>
        ) : (
          (subtype !== "standard" || type === "two_by_two_multiply") && (
            <span>{getSubtypeLabel(type, subtype)}</span>
          )
        )}
      </div>
      <TargetHeader subtype={subtype} type={type} />
      {questionCount !== undefined && (
        <label className="trendCountPicker">
          <span>题量</span>
          <select
            aria-label={`${trackTitle}题量趋势`}
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
                    ? `最近：${latest.totalSeconds}s / ${latest.accuracyPercent}%`
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

/** Renders legacy tracks plus only the skill-drill tracks that actually exist. */
export function HistoryCharts({ sessions }: { sessions: TrainingSession[] }) {
  const tracks = useMemo(() => {
    const legacyTracks = (Object.keys(typeLabels) as QuestionType[]).flatMap(
      (type) =>
        subtypesForType(type).map((subtype) => ({ type, subtype })),
    );
    const skillSubtypes = Array.from(
      new Set(
        sessions
          .filter(
            (session) =>
              session.status === "completed" &&
              session.questionType === "skill_drill" &&
              parseSkillDrillSubtype(session.subtype),
          )
          .map((session) => session.subtype),
      ),
    ).sort();
    return [
      ...legacyTracks,
      ...skillSubtypes.map((subtype) => ({
        type: "skill_drill" as const,
        subtype,
      })),
    ];
  }, [sessions]);

  return (
    <section className="historyCharts" aria-label="各题型成长趋势">
      <h2>成长趋势</h2>
      <p className="historyChartsHint">
        左右分别显示 🐟 和
        🐱；旧题型按同一题型和答题规则比较，专项训练则按同一能力 ID、同一难度独立比较。完整历史会自动按记录量汇总，方便查看长期变化。
      </p>
      {tracks.map(({ type, subtype }) => (
        <TrackCharts
          key={`${type}-${subtype}`}
          sessions={sessions}
          type={type}
          subtype={subtype}
        />
      ))}
    </section>
  );
}
