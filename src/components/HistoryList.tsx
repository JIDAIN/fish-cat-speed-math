"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getRating, sessionMetrics, summarizeHistory } from "@/lib/statistics";
import {
  QuestionType,
  Subtype,
  TrainingSession,
  subtypeLabels,
  typeLabels,
} from "@/lib/types";

const USERS = [
  { id: "fish", label: "🐟 小鱼" },
  { id: "cat", label: "🐱 小猫" },
] as const;

type UserId = (typeof USERS)[number]["id"];
const formatTime = (milliseconds: number) =>
  `${(milliseconds / 1000).toFixed(1)}秒`;

function syncLabel(
  session: TrainingSession,
  isOwn: boolean,
  signedIn: boolean,
) {
  if (!signedIn) return "仅本地";
  if (!isOwn) return "共享只读";
  return session.syncStatus === "syncing"
    ? "同步中"
    : session.syncStatus === "synced" || session.syncedAt
      ? "已同步"
      : session.syncStatus === "failed"
        ? "同步失败"
        : "未同步";
}

export function HistoryList({
  sessions,
  onOpen,
  currentAccountId,
  currentUserId,
  canViewPartner = false,
  onSync,
}: {
  sessions: TrainingSession[];
  onOpen: (session: TrainingSession) => void;
  currentAccountId?: string;
  currentUserId: UserId;
  canViewPartner?: boolean;
  onSync?: (session: TrainingSession) => void;
}) {
  const completed = useMemo(
    () => sessions.filter((session) => session.status === "completed"),
    [sessions],
  );
  const [selectedUserId, setSelectedUserId] = useState<UserId>(currentUserId);
  const [selectedType, setSelectedType] = useState<QuestionType | "all">("all");
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | "all">(
    "all",
  );
  useEffect(() => setSelectedUserId(currentUserId), [currentUserId]);

  const visibleUsers = canViewPartner
    ? USERS
    : USERS.filter((user) => user.id === currentUserId);
  const userSessions = useMemo(
    () => completed.filter((session) => session.userId === selectedUserId),
    [completed, selectedUserId],
  );
  const availableTypes = useMemo(
    () => [...new Set(userSessions.map((session) => session.questionType))],
    [userSessions],
  );
  useEffect(() => {
    if (selectedType !== "all" && !availableTypes.includes(selectedType)) {
      setSelectedType("all");
      setSelectedSubtype("all");
    }
  }, [availableTypes, selectedType]);
  const availableSubtypes = useMemo(
    () => [
      ...new Set(
        userSessions
          .filter(
            (session) =>
              selectedType === "all" || session.questionType === selectedType,
          )
          .map((session) => session.subtype),
      ),
    ],
    [selectedType, userSessions],
  );
  useEffect(() => {
    if (
      selectedSubtype !== "all" &&
      !availableSubtypes.includes(selectedSubtype)
    ) {
      setSelectedSubtype("all");
    }
  }, [availableSubtypes, selectedSubtype]);

  const filtered = userSessions
    .filter(
      (session) =>
        selectedType === "all" || session.questionType === selectedType,
    )
    .filter(
      (session) =>
        selectedSubtype === "all" || session.subtype === selectedSubtype,
    )
    .sort((left, right) => right.startedAt - left.startedAt);
  const summary = summarizeHistory(filtered);

  return (
    <section className="historyList">
      <div className="historyUserTabs" aria-label="查看训练用户">
        {visibleUsers.map((user) => (
          <button
            className={user.id === selectedUserId ? "selected" : ""}
            key={user.id}
            onClick={() => {
              setSelectedUserId(user.id);
              setSelectedType("all");
              setSelectedSubtype("all");
            }}
          >
            {user.label}
            {user.id !== currentUserId && "（只读）"}
          </button>
        ))}
      </div>
      <div className="historyFilters">
        <label>
          <span>题型</span>
          <select
            aria-label="筛选题型"
            onChange={(event) => {
              setSelectedType(event.target.value as QuestionType | "all");
              setSelectedSubtype("all");
            }}
            value={selectedType}
          >
            <option value="all">全部题型</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        {availableSubtypes.length > 1 && (
          <label>
            <span>模式</span>
            <select
              aria-label="筛选子模式"
              onChange={(event) =>
                setSelectedSubtype(event.target.value as Subtype | "all")
              }
              value={selectedSubtype}
            >
              <option value="all">全部模式</option>
              {availableSubtypes.map((subtype) => (
                <option key={subtype} value={subtype}>
                  {subtypeLabels[subtype]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {filtered.length ? (
        <>
          <section className="historySummary" aria-label="当前筛选汇总">
            <b>
              {summary.sessionCount}
              <small>训练组数</small>
            </b>
            <b>
              {summary.questionCount}
              <small>总题数</small>
            </b>
            <b>
              {Math.round(summary.accuracy * 100)}%<small>总正确率</small>
            </b>
            <b>
              {(summary.averageMs / 1000).toFixed(1)}秒<small>平均单题</small>
            </b>
            <b>
              {summary.latestRating}
              <small>最近等级</small>
            </b>
            <b>
              {summary.bestRating}
              <small>最佳等级</small>
            </b>
          </section>
          <p className="ratingDistribution">
            等级分布：优秀 {summary.ratingCounts.优秀} · 良好{" "}
            {summary.ratingCounts.良好} · 合格 {summary.ratingCounts.合格} ·
            继续加油 {summary.ratingCounts.继续加油}
          </p>
          <div className="historyCards">
            {filtered.map((session) => {
              const metrics = sessionMetrics(session);
              const isOwn =
                Boolean(currentAccountId) &&
                session.ownerAccountId === currentAccountId;
              const status = syncLabel(
                session,
                isOwn,
                Boolean(currentAccountId),
              );
              return (
                <article className="historySession" key={session.id}>
                  <button
                    className="historySessionOpen"
                    onClick={() => onOpen(session)}
                  >
                    <span>
                      <strong>
                        {typeLabels[session.questionType]} ·{" "}
                        {subtypeLabels[session.subtype]}
                      </strong>
                      <small>
                        {new Date(session.startedAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {metrics.questionCount}题
                      </small>
                    </span>
                    <span className="historySessionMetrics">
                      {metrics.correctCount}/{metrics.questionCount} ·{" "}
                      {formatTime(session.accumulatedMs)}
                      <br />
                      <small>
                        平均 {(metrics.averageMs / 1000).toFixed(1)}秒 ·{" "}
                        {getRating(session)}
                      </small>
                    </span>
                  </button>
                  <div className="historySync">
                    <span
                      className={`syncStatus syncStatus-${session.syncStatus ?? "not_synced"}`}
                    >
                      {status}
                    </span>
                    {isOwn &&
                      session.syncStatus !== "synced" &&
                      session.syncStatus !== "syncing" &&
                      onSync && (
                        <button onClick={() => onSync(session)}>
                          重试同步
                        </button>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <p className="emptyHistory">当前筛选下还没有完成的训练记录。</p>
      )}
    </section>
  );
}
