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
const PAGE_SIZE = 20;

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
  const [selectedSource, setSelectedSource] = useState<"all" | "normal" | "pk">(
    "all",
  );
  const [selectedCount, setSelectedCount] = useState<number | "all">("all");
  const [selectedRating, setSelectedRating] = useState<
    ReturnType<typeof getRating> | "all"
  >("all");
  const [selectedRange, setSelectedRange] = useState<"all" | "7d" | "30d">(
    "all",
  );
  const [page, setPage] = useState(1);
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
  const availableCounts = useMemo(
    () =>
      [
        ...new Set(userSessions.map((session) => session.questions.length)),
      ].sort((a, b) => a - b),
    [userSessions],
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
    .filter(
      (session) =>
        selectedSource === "all" ||
        (session.trainingSource ?? "normal") === selectedSource,
    )
    .filter(
      (session) =>
        selectedCount === "all" || session.questions.length === selectedCount,
    )
    .filter(
      (session) =>
        selectedRating === "all" || getRating(session) === selectedRating,
    )
    .filter((session) => {
      if (selectedRange === "all") return true;
      const days = selectedRange === "7d" ? 7 : 30;
      return session.startedAt >= Date.now() - days * 24 * 60 * 60 * 1000;
    })
    .sort((left, right) => right.startedAt - left.startedAt);
  const summary = summarizeHistory(filtered);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);
  const resetPage = () => setPage(1);

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
              resetPage();
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
              resetPage();
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
              onChange={(event) => (
                setSelectedSubtype(event.target.value as Subtype | "all"),
                resetPage()
              )}
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
        <label>
          <span>来源</span>
          <select
            aria-label="筛选训练来源"
            value={selectedSource}
            onChange={(event) => {
              setSelectedSource(event.target.value as typeof selectedSource);
              resetPage();
            }}
          >
            <option value="all">全部训练</option>
            <option value="normal">普通训练</option>
            <option value="pk">PK训练</option>
          </select>
        </label>
        <label>
          <span>题量</span>
          <select
            aria-label="筛选题量"
            value={selectedCount}
            onChange={(event) => {
              setSelectedCount(
                event.target.value === "all"
                  ? "all"
                  : Number(event.target.value),
              );
              resetPage();
            }}
          >
            <option value="all">全部题量</option>
            {availableCounts.map((value) => (
              <option key={value} value={value}>
                {value}题
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>等级</span>
          <select
            aria-label="筛选等级"
            value={selectedRating}
            onChange={(event) => {
              setSelectedRating(event.target.value as typeof selectedRating);
              resetPage();
            }}
          >
            <option value="all">全部等级</option>
            <option value="优秀">优秀</option>
            <option value="良好">良好</option>
            <option value="合格">合格</option>
            <option value="继续加油">继续加油</option>
          </select>
        </label>
        <label>
          <span>时间</span>
          <select
            aria-label="筛选时间范围"
            value={selectedRange}
            onChange={(event) => {
              setSelectedRange(event.target.value as typeof selectedRange);
              resetPage();
            }}
          >
            <option value="all">全部时间</option>
            <option value="7d">近7日</option>
            <option value="30d">近30日</option>
          </select>
        </label>
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
            {visible.map((session) => {
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
                        {session.trainingSource === "pk" ? " · PK训练" : ""}
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
          <nav className="pager" aria-label="历史分页">
            <span>
              第 {safePage} 页 / 共 {totalPages} 页
            </span>
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              上一页
            </button>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              下一页
            </button>
          </nav>
        </>
      ) : (
        <p className="emptyHistory">当前筛选下还没有完成的训练记录。</p>
      )}
    </section>
  );
}
