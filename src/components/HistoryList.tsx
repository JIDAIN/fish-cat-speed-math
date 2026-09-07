"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getRating, sessionMetrics, summarizeHistory } from "@/lib/statistics";
import {
  QuestionType,
  Subtype,
  TrainingSession,
  getSubtypeLabel,
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

type SavedHistoryView = {
  selectedUserId?: UserId;
  selectedType?: QuestionType | "all";
  selectedSubtype?: Subtype | "all";
  selectedSource?: "all" | "normal" | "pk";
  selectedCount?: number | "all";
  selectedRating?: ReturnType<typeof getRating> | "all";
  selectedRange?: "all" | "7d" | "30d";
  page?: number;
};

function historyViewKey(currentAccountId: string | undefined, userId: UserId) {
  return `speed-math-history-view:${currentAccountId ?? "unassigned"}:${userId}`;
}

function readSavedHistoryView(
  currentAccountId: string | undefined,
  userId: UserId,
): SavedHistoryView {
  if (typeof window === "undefined") return {};
  try {
    const saved = window.localStorage.getItem(
      historyViewKey(currentAccountId, userId),
    );
    return saved ? (JSON.parse(saved) as SavedHistoryView) : {};
  } catch {
    return {};
  }
}

function writeSavedHistoryView(
  currentAccountId: string | undefined,
  userId: UserId,
  value: SavedHistoryView,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      historyViewKey(currentAccountId, userId),
      JSON.stringify(value),
    );
  } catch {
    // Storage preferences are optional; training history itself is untouched.
  }
}

function normalizedSource(session: TrainingSession) {
  return session.trainingSource === "pk" ? "pk" : "normal";
}

function sessionOwnerRole(session: TrainingSession): UserId | undefined {
  return session.userId === "fish" || session.userId === "cat"
    ? session.userId
    : undefined;
}

function sessionDate(session: TrainingSession) {
  return new Date(session.completedAt ?? session.startedAt);
}

function inDateRange(
  session: TrainingSession,
  range: "all" | "7d" | "30d",
  now = Date.now(),
) {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : 30;
  return now - sessionDate(session).getTime() <= days * 24 * 60 * 60 * 1000;
}

function compareSessions(left: TrainingSession, right: TrainingSession) {
  return (
    (right.completedAt ?? right.startedAt) -
    (left.completedAt ?? left.startedAt)
  );
}

function ratingLabel(session: TrainingSession) {
  return session.rating?.level ?? getRating(session);
}

function trainingTitle(session: TrainingSession) {
  return `${typeLabels[session.questionType]} · ${getSubtypeLabel(
    session.questionType,
    session.subtype,
  )}`;
}

interface HistoryListProps {
  sessions: TrainingSession[];
  currentUserId: UserId;
  currentAccountId?: string;
  canViewPartner: boolean;
  onOpen: (session: TrainingSession) => void;
  onSync?: (session: TrainingSession) => void;
}

export function HistoryList({
  sessions,
  currentUserId,
  currentAccountId,
  canViewPartner,
  onOpen,
  onSync,
}: HistoryListProps) {
  const initialView = useMemo(
    () => readSavedHistoryView(currentAccountId, currentUserId),
    [currentAccountId, currentUserId],
  );
  const [selectedUserId, setSelectedUserId] = useState<UserId>(
    initialView.selectedUserId &&
      (initialView.selectedUserId === currentUserId || canViewPartner)
      ? initialView.selectedUserId
      : currentUserId,
  );
  const [selectedType, setSelectedType] = useState<QuestionType | "all">(
    initialView.selectedType ?? "all",
  );
  const [selectedSubtype, setSelectedSubtype] = useState<Subtype | "all">(
    initialView.selectedSubtype ?? "all",
  );
  const [selectedSource, setSelectedSource] = useState<"all" | "normal" | "pk">(
    initialView.selectedSource ?? "all",
  );
  const [selectedCount, setSelectedCount] = useState<number | "all">(
    initialView.selectedCount ?? "all",
  );
  const [selectedRating, setSelectedRating] = useState<
    ReturnType<typeof getRating> | "all"
  >(initialView.selectedRating ?? "all");
  const [selectedRange, setSelectedRange] = useState<"all" | "7d" | "30d">(
    initialView.selectedRange ?? "all",
  );
  const [page, setPage] = useState(initialView.page ?? 1);

  useEffect(() => {
    if (!canViewPartner && selectedUserId !== currentUserId) {
      setSelectedUserId(currentUserId);
    }
  }, [canViewPartner, currentUserId, selectedUserId]);

  useEffect(() => {
    writeSavedHistoryView(currentAccountId, currentUserId, {
      selectedUserId,
      selectedType,
      selectedSubtype,
      selectedSource,
      selectedCount,
      selectedRating,
      selectedRange,
      page,
    });
  }, [
    currentAccountId,
    currentUserId,
    page,
    selectedCount,
    selectedRange,
    selectedRating,
    selectedSource,
    selectedSubtype,
    selectedType,
    selectedUserId,
  ]);

  const visibleUsers = canViewPartner
    ? USERS
    : USERS.filter((item) => item.id === currentUserId);
  const userSessions = useMemo(
    () =>
      sessions
        .filter((session) => sessionOwnerRole(session) === selectedUserId)
        .sort(compareSessions),
    [selectedUserId, sessions],
  );
  const availableTypes = useMemo(
    () => Array.from(new Set(userSessions.map((session) => session.questionType))),
    [userSessions],
  );
  const typeScopedSessions = useMemo(
    () =>
      selectedType === "all"
        ? userSessions
        : userSessions.filter((session) => session.questionType === selectedType),
    [selectedType, userSessions],
  );
  const availableSubtypes = useMemo(
    () => Array.from(new Set(typeScopedSessions.map((session) => session.subtype))),
    [typeScopedSessions],
  );
  const availableCounts = useMemo(
    () =>
      Array.from(new Set(userSessions.map((session) => session.questions.length))).sort(
        (left, right) => left - right,
      ),
    [userSessions],
  );
  const filtered = useMemo(
    () =>
      userSessions.filter((session) => {
        if (selectedType !== "all" && session.questionType !== selectedType)
          return false;
        if (selectedSubtype !== "all" && session.subtype !== selectedSubtype)
          return false;
        if (
          selectedSource !== "all" &&
          normalizedSource(session) !== selectedSource
        )
          return false;
        if (
          selectedCount !== "all" &&
          session.questions.length !== selectedCount
        )
          return false;
        if (
          selectedRating !== "all" &&
          ratingLabel(session) !== selectedRating
        )
          return false;
        return inDateRange(session, selectedRange);
      }),
    [
      selectedCount,
      selectedRange,
      selectedRating,
      selectedSource,
      selectedSubtype,
      selectedType,
      userSessions,
    ],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const summary = summarizeHistory(filtered);
  const resetPage = () => setPage(1);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <section className="historyList">
      <div className="historyUserSwitch" role="group" aria-label="选择训练账号">
        {visibleUsers.map((item) => (
          <button
            aria-pressed={selectedUserId === item.id}
            className={selectedUserId === item.id ? "selected" : ""}
            key={item.id}
            onClick={() => {
              setSelectedUserId(item.id);
              resetPage();
            }}
            type="button"
          >
            {item.label}
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
                  {selectedType === "all"
                    ? getSubtypeLabel("skill_drill", subtype)
                    : getSubtypeLabel(selectedType, subtype)}
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
            {availableCounts.map((count) => (
              <option key={count} value={count}>
                {count}题
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>评级</span>
          <select
            aria-label="筛选评级"
            value={selectedRating}
            onChange={(event) => {
              setSelectedRating(event.target.value as typeof selectedRating);
              resetPage();
            }}
          >
            <option value="all">全部评级</option>
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
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
          </select>
        </label>
      </div>

      <div className="historySummary">
        <span>{filtered.length}次训练</span>
        <span>{summary.totalQuestions}题</span>
        <span>{Math.round(summary.accuracy * 100)}%正确率</span>
      </div>

      {pageItems.length ? (
        <div className="historyEntries">
          {pageItems.map((session) => {
            const metrics = sessionMetrics(session);
            const canSync =
              Boolean(onSync) &&
              session.ownerAccountId === currentAccountId &&
              session.syncStatus !== "syncing";
            return (
              <article className="historyCard" key={session.id}>
                <button
                  className="historyCardOpen"
                  onClick={() => onOpen(session)}
                  type="button"
                >
                  <strong>{trainingTitle(session)}</strong>
                  <span>
                    {sessionDate(session).toLocaleString()} · {metrics.correctCount}/
                    {session.questions.length} · {formatTime(session.accumulatedMs)}
                  </span>
                  <span>
                    {ratingLabel(session)} · {normalizedSource(session) === "pk" ? "PK" : "普通"}
                  </span>
                </button>
                {canSync && (
                  <button
                    className="historySyncButton"
                    onClick={() => onSync?.(session)}
                    type="button"
                  >
                    {session.syncStatus === "synced" || session.syncedAt
                      ? "重新同步"
                      : "同步"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p>当前筛选条件下没有训练记录。</p>
      )}

      {pageCount > 1 && (
        <div className="historyPagination">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            上一页
          </button>
          <span>
            {safePage}/{pageCount}
          </span>
          <button
            disabled={safePage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            type="button"
          >
            下一页
          </button>
        </div>
      )}
    </section>
  );
}
