"use client";

import React, { useEffect, useMemo, useState } from "react";
import { sessionMetrics } from "@/lib/statistics";
import { TrainingSession, subtypeLabels, typeLabels } from "@/lib/types";

const USERS = [
  { id: "fish", label: "🐟 小鱼" },
  { id: "cat", label: "🐱 小猫" },
] as const;

const dateKey = (value: number) => new Date(value).toLocaleDateString("zh-CN");

export function HistoryList({
  sessions,
  onOpen,
}: {
  sessions: TrainingSession[];
  onOpen: (session: TrainingSession) => void;
}) {
  // The component can be called with the raw local-session collection. Keep
  // unfinished or abandoned sessions out of the date picker and history UI.
  const completedSessions = useMemo(
    () => sessions.filter((session) => session.status === "completed"),
    [sessions],
  );
  const dates = useMemo(
    () =>
      [
        ...new Set(
          completedSessions.map((session) => dateKey(session.startedAt)),
        ),
      ].sort((left, right) => {
        const leftLatest = Math.max(
          ...completedSessions
            .filter((session) => dateKey(session.startedAt) === left)
            .map((session) => session.startedAt),
        );
        const rightLatest = Math.max(
          ...completedSessions
            .filter((session) => dateKey(session.startedAt) === right)
            .map((session) => session.startedAt),
        );
        return rightLatest - leftLatest;
      }),
    [completedSessions],
  );
  const [selectedDate, setSelectedDate] = useState(() => dates[0] ?? "");
  useEffect(() => {
    if (!dates.includes(selectedDate)) setSelectedDate(dates[0] ?? "");
  }, [dates, selectedDate]);
  const selectedSessions = completedSessions
    .filter((session) => dateKey(session.startedAt) === selectedDate)
    .sort((left, right) => right.startedAt - left.startedAt);

  if (!completedSessions.length)
    return <p className="emptyHistory">还没有完成的训练记录。</p>;

  return (
    <section className="historyList">
      <div className="datePicker" aria-label="选择训练日期">
        {dates.map((date) => (
          <button
            className={date === selectedDate ? "selected" : ""}
            key={date}
            onClick={() => setSelectedDate(date)}
          >
            {date}
          </button>
        ))}
      </div>
      {USERS.map((user) => {
        const userSessions = selectedSessions.filter(
          (session) => session.userId === user.id,
        );
        return (
          <section className="historyUserSection" key={user.id}>
            <h2>{user.label}</h2>
            {userSessions.length ? (
              userSessions.map((session) => {
                const metrics = sessionMetrics(session);
                return (
                  <button
                    className="historySession"
                    key={session.id}
                    onClick={() => onOpen(session)}
                  >
                    <span>
                      <strong>{typeLabels[session.questionType]}</strong>
                      <small>
                        {subtypeLabels[session.subtype]} ·{" "}
                        {new Date(session.startedAt).toLocaleTimeString(
                          "zh-CN",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </small>
                    </span>
                    <span className="historySessionMetrics">
                      {metrics.correctCount}/{metrics.questionCount} ·{" "}
                      {(session.accumulatedMs / 1000).toFixed(1)}s<br />
                      <small>点击查看详情</small>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="emptyUser">当天暂无训练。</p>
            )}
          </section>
        );
      })}
    </section>
  );
}
