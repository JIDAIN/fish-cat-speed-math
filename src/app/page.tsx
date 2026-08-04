"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  QuestionType,
  Subtype,
  TrainingSession,
  typeLabels,
  subtypeLabels,
} from "@/lib/types";
import {
  discardSession,
  claimCompletedSessions,
  discardCompletedSessions,
  readActive,
  readCompleted,
  saveSession,
} from "@/lib/storage";
import { AccountPanel } from "@/components/AccountPanel";
import {
  CloudIdentity,
  currentIdentity,
  readCloudHistory,
  syncCompleted,
} from "@/lib/cloud";
import { NumberPad } from "@/components/NumberPad";
import { ScratchCanvas } from "@/components/ScratchCanvas";
import { HistoryCharts } from "@/components/HistoryCharts";
import { HistoryList } from "@/components/HistoryList";
import {
  QuestionDetails,
  RatingBreakdown,
  SessionDetails,
} from "@/components/SessionDetails";
import { ActiveSessionDialog } from "@/components/ActiveSessionDialog";
import { TrainingTypeSelector } from "@/components/TrainingTypeSelector";
import {
  QuestionCountDialog,
  QuestionCountSelection,
} from "@/components/QuestionCountDialog";
import {
  DEFAULT_CUSTOM_QUESTION_COUNT,
  isValidQuestionCount,
  STANDARD_QUESTION_COUNT,
} from "@/lib/question-count";
import { createRatingSnapshot, sessionMetrics } from "@/lib/statistics";
import {
  currentElapsedMs,
  pauseSessionTimer,
  resumeSessionTimer,
  suspendUnverifiedTimer,
} from "@/lib/timer";
import { createTrainingSession } from "@/lib/session";
import { submitCurrentAnswer } from "@/lib/training";
const defaultSubtype = (t: QuestionType): Subtype =>
  t === "three_by_two_division"
    ? "quotient_two"
    : t === "multi_digit_division"
      ? "quotient_two"
      : t === "fraction_percent_conversion"
        ? "fraction_to_percent"
        : t === "fraction_comparison"
          ? "comparison"
          : "standard";
type ActiveSessionPrompt = {
  session: TrainingSession;
  afterDiscard: "startNew" | "stayHome";
};

function FractionComparisonDisplay({
  data,
  selectedRelation,
  fallbackPrompt,
}: {
  data: TrainingSession["questions"][number]["data"];
  selectedRelation: string;
  fallbackPrompt: string;
}) {
  const values = [data.a, data.b, data.c, data.d];
  if (!values.every((value) => typeof value === "number")) {
    return <h1>{fallbackPrompt}</h1>;
  }

  const [leftNumerator, leftDenominator, rightNumerator, rightDenominator] =
    values as number[];

  return (
    <div className="fractionComparisonQuestion" aria-label={fallbackPrompt}>
      <span className="verticalFraction">
        <span>{leftNumerator}</span>
        <span>{leftDenominator}</span>
      </span>
      <strong aria-label="当前选择">{selectedRelation || "?"}</strong>
      <span className="verticalFraction">
        <span>{rightNumerator}</span>
        <span>{rightDenominator}</span>
      </span>
    </div>
  );
}

type FractionEntryPart = "numerator" | "denominator";

function splitFractionAnswer(value: string): [string, string] {
  const [numerator = "", denominator = ""] = value.split("/", 2);
  return [numerator, denominator];
}

function FractionConversionDisplay({
  data,
  subtype,
  value,
  activePart,
  onSelectPart,
  fallbackPrompt,
}: {
  data: TrainingSession["questions"][number]["data"];
  subtype: Subtype;
  value: string;
  activePart: FractionEntryPart;
  onSelectPart: (part: FractionEntryPart) => void;
  fallbackPrompt: string;
}) {
  const numerator = data.numerator;
  const denominator = data.denominator;
  if (typeof numerator !== "number" || typeof denominator !== "number") {
    return <h1>{fallbackPrompt}</h1>;
  }

  if (subtype === "fraction_to_percent") {
    return (
      <div className="fractionConversionQuestion" aria-label={fallbackPrompt}>
        <span>
          {numerator}/{denominator} ≈
        </span>
        <strong className="percentAnswerSlot">{value || "___"}</strong>
        <span>%</span>
      </div>
    );
  }

  const [answerNumerator, answerDenominator] = splitFractionAnswer(value);
  const percent =
    typeof data.percentAnswer === "string"
      ? data.percentAnswer
      : typeof data.percent === "number"
        ? String(data.percent)
        : String((numerator / denominator) * 100);

  return (
    <div className="fractionConversionQuestion" aria-label={fallbackPrompt}>
      <span>{percent}% ≈</span>
      <span className="fractionAnswerSlots">
        <button
          aria-label="输入分子"
          aria-pressed={activePart === "numerator"}
          className={activePart === "numerator" ? "active" : ""}
          onClick={() => onSelectPart("numerator")}
        >
          {answerNumerator || "\u00a0"}
        </button>
        <span className="fractionAnswerLine" aria-hidden="true" />
        <button
          aria-label="输入分母"
          aria-pressed={activePart === "denominator"}
          className={activePart === "denominator" ? "active" : ""}
          onClick={() => onSelectPart("denominator")}
        >
          {answerDenominator || "\u00a0"}
        </button>
      </span>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<
    "home" | "training" | "result" | "history" | "stats" | "historyDetail"
  >("home");
  const [user, setUser] = useState("fish");
  const [identity, setIdentity] = useState<CloudIdentity>();
  const [authResolved, setAuthResolved] = useState(false);
  const [unassignedHistory, setUnassignedHistory] = useState<TrainingSession[]>(
    [],
  );
  const [type, setType] = useState<QuestionType>("two_digit_add_subtract");
  const [subtype, setSubtype] = useState<Subtype>(
    defaultSubtype("two_digit_add_subtract"),
  );
  const [count, setCount] = useState(STANDARD_QUESTION_COUNT);
  const [lastCustomCount, setLastCustomCount] = useState(
    DEFAULT_CUSTOM_QUESTION_COUNT,
  );
  const [isQuestionCountDialogOpen, setIsQuestionCountDialogOpen] =
    useState(false);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [scratch, setScratch] = useState(false);
  const [fractionEntryPart, setFractionEntryPart] =
    useState<FractionEntryPart>("numerator");
  const [hasAutoAdvancedFractionEntry, setHasAutoAdvancedFractionEntry] =
    useState(false);
  const [history, setHistory] = useState<TrainingSession[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] =
    useState<TrainingSession | null>(null);
  const [activeSessionPrompt, setActiveSessionPrompt] =
    useState<ActiveSessionPrompt | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  // React state updates are asynchronous. This ref closes the small gap in
  // which two rapid taps could both read IndexedDB before the first tap has
  // entered the training view.
  const startInFlight = useRef(false);
  const restartInFlight = useRef(false);
  const sessionRef = useRef<TrainingSession | null>(null);
  const viewRef = useRef(view);
  const [isRestartingTraining, setIsRestartingTraining] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    readCompleted()
      .then((items) =>
        setUnassignedHistory(items.filter((item) => !item.ownerAccountId)),
      )
      .catch(() => undefined);
  }, [identity?.id]);
  useEffect(() => {
    currentIdentity()
      .then((next) => {
        setIdentity(next);
        if (next) setUser(next.role);
      })
      .catch(() => undefined)
      .finally(() => setAuthResolved(true));
  }, []);
  useEffect(() => {
    if (!authResolved) return;
    let cancelled = false;
    readActive(identity?.id)
      .then((activeSession) => {
        if (!activeSession || cancelled) return;
        // Recovery never continues an old running segment. This also repairs
        // active sessions saved by versions that did not pause on page exit.
        const pausedSession = suspendUnverifiedTimer(activeSession);
        if (pausedSession !== activeSession) void saveSession(pausedSession);
        setActiveSessionPrompt({
          session: pausedSession,
          afterDiscard: "startNew",
        });
      })
      .catch(() => setStorageError("本地训练记录读取失败，请刷新后重试。"));
    return () => {
      cancelled = true;
    };
  }, [authResolved, identity?.id]);
  useEffect(() => {
    if (session?.status === "active") {
      saveSession(session).catch(() =>
        setStorageError("训练暂存失败，请保持页面打开并刷新后重试。"),
      );
    }
  }, [session]);
  useEffect(() => {
    const pause = () => {
      const activeSession = sessionRef.current;
      if (!activeSession || activeSession.status !== "active") return;
      const pausedSession = pauseSessionTimer(activeSession);
      if (pausedSession === activeSession) return;
      sessionRef.current = pausedSession;
      setSession(pausedSession);
      // pagehide/freeze can end JavaScript immediately; save in this handler
      // instead of waiting for React's follow-up effect.
      void saveSession(pausedSession).catch(() =>
        setStorageError("训练暂存失败，请保持页面打开并刷新后重试。"),
      );
    };
    const resume = () => {
      const activeSession = sessionRef.current;
      if (
        !activeSession ||
        activeSession.status !== "active" ||
        viewRef.current !== "training" ||
        document.hidden
      )
        return;
      const resumedSession = resumeSessionTimer(activeSession);
      if (resumedSession === activeSession) return;
      sessionRef.current = resumedSession;
      setSession(resumedSession);
    };
    const onVisibilityChange = () => (document.hidden ? pause() : resume());
    // A back/forward navigation can enter BFCache without first delivering a
    // visibility transition on some mobile browsers. pagehide is primary;
    // these navigation/unload events are defensive equivalents.
    const onNavigationAway = () => pause();
    const onPageShow = () => {
      const activeSession = sessionRef.current;
      if (activeSession?.status === "active") {
        // If pagehide's async write was interrupted, do not calculate the
        // BFCache/navigation gap from its stale runningSince timestamp.
        const suspended = suspendUnverifiedTimer(activeSession);
        sessionRef.current = suspended;
        setSession(suspended);
      }
      resume();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("freeze", pause);
    window.addEventListener("pagehide", pause);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onNavigationAway);
    window.addEventListener("hashchange", onNavigationAway);
    window.addEventListener("beforeunload", onNavigationAway);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("freeze", pause);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onNavigationAway);
      window.removeEventListener("hashchange", onNavigationAway);
      window.removeEventListener("beforeunload", onNavigationAway);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
    };
  }, []);
  const elapsed = session ? currentElapsedMs(session, now) : 0;
  const current = session?.questions[session.currentIndex];
  useEffect(() => {
    setFractionEntryPart("numerator");
    setHasAutoAdvancedFractionEntry(false);
  }, [current?.id]);
  const beginNewSession = () => {
    if (!isValidQuestionCount(count)) {
      setStorageError("题量无效，请重新选择 10～100 题。");
      return;
    }
    const s = createTrainingSession({
      userId: user,
      ownerAccountId: identity?.id,
      questionType: type,
      subtype,
      questionCount: count,
    });
    sessionRef.current = s;
    setSession(s);
    setView("training");
  };
  const confirmQuestionCount = ({
    count: selectedCount,
    mode,
  }: QuestionCountSelection) => {
    setCount(selectedCount);
    if (mode === "custom") setLastCustomCount(selectedCount);
    setIsQuestionCountDialogOpen(false);
  };
  const start = async () => {
    if (startInFlight.current) return;
    startInFlight.current = true;

    try {
      // Read immediately before creation instead of relying on the initial
      // page-load check. This catches a session created earlier in this tab
      // or saved by another tab before this click.
      const activeSession =
        session?.status === "active" && session.ownerAccountId === identity?.id
          ? session
          : await readActive(identity?.id);
      if (activeSession) {
        setActiveSessionPrompt({
          session: activeSession,
          afterDiscard: "startNew",
        });
        return;
      }
      beginNewSession();
    } catch {
      setStorageError("读取本地训练记录失败，请刷新后重试。");
    } finally {
      startInFlight.current = false;
    }
  };
  const changeIdentity = (next?: CloudIdentity) => {
    const activeSession = sessionRef.current;
    if (activeSession?.status === "active") {
      const pausedSession = pauseSessionTimer(activeSession);
      sessionRef.current = pausedSession;
      void saveSession(pausedSession).catch(() =>
        setStorageError("训练暂存失败，请保持页面打开并刷新后重试。"),
      );
    }
    // A prompt/session from the previous account must never be continued,
    // discarded, or overwritten after an account switch.
    setSession(null);
    sessionRef.current = null;
    setActiveSessionPrompt(null);
    setIdentity(next);
    setUser(next?.role ?? "fish");
  };
  const continueActiveSession = () => {
    if (!activeSessionPrompt) return;
    const resumedSession = resumeSessionTimer(activeSessionPrompt.session);
    sessionRef.current = resumedSession;
    setSession(resumedSession);
    setActiveSessionPrompt(null);
    setView("training");
  };
  const discardActiveSession = async () => {
    if (!activeSessionPrompt) return;
    const { afterDiscard, session: activeSession } = activeSessionPrompt;
    await discardSession(activeSession.id);
    setSession(null);
    setActiveSessionPrompt(null);
    if (afterDiscard === "startNew") beginNewSession();
  };
  const submit = () => {
    if (!session) return;
    const next = submitCurrentAnswer(session, elapsed, scratch);
    if (next === session) return;
    if (next.status === "completed") {
      const completed = {
        ...next,
        rating: createRatingSnapshot(next),
        syncStatus:
          identity && next.ownerAccountId === identity.id
            ? ("syncing" as const)
            : ("not_synced" as const),
      };
      setSession(completed);
      const localSave = saveSession(completed);
      localSave.catch(() =>
        setStorageError("本次训练已完成，但本地保存失败，请刷新后重试。"),
      );
      if (identity && completed.ownerAccountId === identity.id) {
        localSave
          .then(() => syncCompleted(completed))
          .then(
            () => {
              const synced = {
                ...completed,
                syncStatus: "synced" as const,
                syncedAt: Date.now(),
              };
              setSession(synced);
              return saveSession(synced);
            },
            () => {
              const failed = { ...completed, syncStatus: "failed" as const };
              setSession(failed);
              return saveSession(failed);
            },
          )
          .catch(() =>
            setStorageError("本地已保存；云端同步失败，可稍后在历史中重试。"),
          );
      }
      setView("result");
    } else setSession(next);
    setScratch(false);
  };
  const restartTraining = async () => {
    if (!session || restartInFlight.current) return;
    restartInFlight.current = true;
    setIsRestartingTraining(true);

    try {
      // Use the active session's frozen settings. Home selectors may no longer
      // match a session that was resumed from IndexedDB.
      const replacement = createTrainingSession({
        userId: session.userId,
        ownerAccountId: session.ownerAccountId,
        questionType: session.questionType,
        subtype: session.subtype,
        questionCount: session.questionCount,
      });
      // saveSession replaces every older active record in one transaction, so
      // there is never a recoverable half-restarted state.
      await saveSession(replacement);
      setScratch(false);
      sessionRef.current = replacement;
      setSession(replacement);
      setView("training");
    } catch {
      setStorageError("重开训练失败，原训练仍可继续，请稍后重试。");
    } finally {
      restartInFlight.current = false;
      setIsRestartingTraining(false);
    }
  };
  const loadHistory = async () => {
    try {
      const local = await readCompleted();
      const owned = identity
        ? local.filter((item) => item.ownerAccountId === identity.id)
        : local.filter((item) => !item.ownerAccountId);
      setUnassignedHistory(local.filter((item) => !item.ownerAccountId));
      const cloud = identity ? await readCloudHistory().catch(() => []) : [];
      setHistory([
        ...owned,
        ...cloud.filter(
          (item) => !owned.some((localItem) => localItem.id === item.id),
        ),
      ]);
      setView("history");
    } catch {
      setStorageError("历史记录读取失败，请刷新后重试。");
    }
  };
  const syncOwnedSession = async (candidate: TrainingSession) => {
    if (!identity || candidate.ownerAccountId !== identity.id) return;
    const syncing = { ...candidate, syncStatus: "syncing" as const };
    await saveSession(syncing);
    setHistory((items) =>
      items.map((item) => (item.id === syncing.id ? syncing : item)),
    );
    if (session?.id === syncing.id) setSession(syncing);
    try {
      await syncCompleted(syncing);
      const synced = {
        ...syncing,
        syncStatus: "synced" as const,
        syncedAt: Date.now(),
      };
      await saveSession(synced);
      setHistory((items) =>
        items.map((item) => (item.id === synced.id ? synced : item)),
      );
      if (session?.id === synced.id) setSession(synced);
    } catch {
      const failed = { ...syncing, syncStatus: "failed" as const };
      await saveSession(failed);
      setHistory((items) =>
        items.map((item) => (item.id === failed.id ? failed : item)),
      );
      if (session?.id === failed.id) setSession(failed);
      setStorageError("同步失败；本地训练已安全保留，可稍后重试。");
    }
  };
  if (view === "training" && session && current)
    return (
      <main className="trainingPage">
        <header className="trainingHeader">
          <button
            onClick={() => {
              const pausedSession = pauseSessionTimer(session);
              sessionRef.current = pausedSession;
              setSession(pausedSession);
              saveSession(pausedSession);
              setView("home");
            }}
          >
            ← 暂存
          </button>
          <span>
            {session.currentIndex + 1}/{session.questions.length}
          </span>
          <b>{(elapsed / 1000).toFixed(1)} 秒</b>
          <button onClick={() => setScratch(true)}>✎ 草稿</button>
        </header>
        <section className="training trainingMain">
          {session.subtype !== "percent_to_fraction" ? (
            <p className="rule">
              {session.subtype === "quotient_first"
                ? "求商首位，不四舍五入"
                : session.subtype === "quotient_two"
                  ? "求商前两位，不四舍五入"
                  : session.subtype === "quotient_estimate_3_percent"
                    ? "输入近似商，相对误差不超过 3%"
                    : session.subtype === "comparison"
                      ? "请选择两个分数的大小关系"
                      : session.subtype === "fraction_to_percent"
                        ? "输入近似百分数，可保留一位小数"
                        : "请输入答案"}
            </p>
          ) : null}
          {session.questionType === "fraction_comparison" ? (
            <FractionComparisonDisplay
              data={current.data}
              fallbackPrompt={current.prompt}
              selectedRelation={session.currentAnswer}
            />
          ) : session.questionType === "fraction_percent_conversion" ? (
            <>
              <FractionConversionDisplay
                activePart={fractionEntryPart}
                data={current.data}
                fallbackPrompt={current.prompt}
                onSelectPart={(part) => {
                  setFractionEntryPart(part);
                  if (part === "numerator") {
                    setHasAutoAdvancedFractionEntry(true);
                  }
                }}
                subtype={session.subtype}
                value={session.currentAnswer}
              />
              <button
                className="restart"
                disabled={isRestartingTraining}
                onClick={restartTraining}
              >
                {isRestartingTraining ? "正在重开…" : "重开训练"}
              </button>
            </>
          ) : (
            <>
              <h1>{current.prompt}</h1>
              <div className="answer" aria-label="当前答案" aria-live="polite">
                {session.currentAnswer}
              </div>
              <button
                className="restart"
                disabled={isRestartingTraining}
                onClick={restartTraining}
              >
                {isRestartingTraining ? "正在重开…" : "重开训练"}
              </button>
            </>
          )}
          {session.questionType === "fraction_comparison" ? (
            <div className="comparisonPad trainingKeypad">
              <div className="comparisonChoices">
                {[
                  { label: "大于", value: ">" },
                  { label: "小于", value: "<" },
                ].map(({ label, value }) => (
                  <button
                    className={
                      session.currentAnswer === value ? "selected" : ""
                    }
                    key={value}
                    onClick={() =>
                      setSession({ ...session, currentAnswer: value })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="comparisonActions">
                <button
                  className="restartTrainingButton"
                  disabled={isRestartingTraining}
                  onClick={restartTraining}
                >
                  {isRestartingTraining ? "正在重开…" : "重开训练"}
                </button>
                <button
                  className="primary"
                  disabled={!session.currentAnswer}
                  onClick={submit}
                >
                  确定
                </button>
              </div>
            </div>
          ) : session.questionType === "fraction_percent_conversion" &&
            session.subtype === "percent_to_fraction" ? (
            <NumberPad
              submitDisabled={splitFractionAnswer(session.currentAnswer).some(
                (part) => !part,
              )}
              value={
                splitFractionAnswer(session.currentAnswer)[
                  fractionEntryPart === "numerator" ? 0 : 1
                ]
              }
              onChange={(partValue) => {
                const [numerator, denominator] = splitFractionAnswer(
                  session.currentAnswer,
                );
                setSession({
                  ...session,
                  currentAnswer:
                    fractionEntryPart === "numerator"
                      ? `${partValue}/${denominator}`
                      : `${numerator}/${partValue}`,
                });
                if (
                  fractionEntryPart === "numerator" &&
                  !hasAutoAdvancedFractionEntry &&
                  numerator === "" &&
                  /^\d$/.test(partValue)
                ) {
                  setHasAutoAdvancedFractionEntry(true);
                  setFractionEntryPart("denominator");
                }
              }}
              onSubmit={submit}
            />
          ) : (
            <NumberPad
              value={session.currentAnswer}
              onChange={(v) => setSession({ ...session, currentAnswer: v })}
              onSubmit={submit}
            />
          )}
        </section>
        {scratch && <ScratchCanvas onClose={() => setScratch(false)} />}
      </main>
    );
  if (view === "result" && session) {
    const metrics = sessionMetrics(session);
    return (
      <main className="panel">
        <h1>训练完成！</h1>
        <p>
          {typeLabels[session.questionType]} · {subtypeLabels[session.subtype]}
        </p>
        <div className="metrics">
          <b>
            {metrics.correctCount}/{session.questions.length}
            <small>正确题数</small>
          </b>
          <b>
            {(session.accumulatedMs / 1000).toFixed(1)}s<small>总用时</small>
          </b>
          <b>
            {(session.accumulatedMs / session.questions.length / 1000).toFixed(
              1,
            )}
            s<small>平均每题</small>
          </b>
        </div>
        <RatingBreakdown session={session} />
        <QuestionDetails session={session} />
        {identity && session.ownerAccountId === identity.id && (
          <p
            className={`syncStatus syncStatus-${session.syncStatus ?? "not_synced"}`}
          >
            同步状态：
            {session.syncStatus === "syncing"
              ? "同步中"
              : session.syncStatus === "synced" || session.syncedAt
                ? "已同步"
                : session.syncStatus === "failed"
                  ? "同步失败"
                  : "未同步"}
          </p>
        )}
        {identity && session.ownerAccountId === identity.id && (
          <button
            className="wide"
            disabled={session.syncStatus === "syncing"}
            onClick={() => syncOwnedSession(session)}
          >
            {session.syncStatus === "syncing"
              ? "同步中"
              : session.syncedAt
                ? "已同步，重新同步"
                : "同步本次训练"}
          </button>
        )}
        {session && false && (
          <>
            <h2>题目明细</h2>
            {session!.records.map((r, i) => (
              <p className={r.isCorrect ? "ok" : "wrong"} key={r.question.id}>
                {i + 1}. {r.question.prompt}　{r.userAnswer}　
                {r.isCorrect ? "✓" : "✗ " + r.question.answer}　
                {(r.timeUsedMs / 1000).toFixed(1)}s
              </p>
            ))}
          </>
        )}
        <button className="primary wide" onClick={() => setView("home")}>
          返回首页
        </button>
      </main>
    );
  }
  if (view === "history") {
    return (
      <main className="panel">
        <button onClick={() => setView("home")}>← 首页</button>
        <h1>历史记录</h1>
        <HistoryList
          currentAccountId={identity?.id}
          currentUserId={(identity?.role ?? user) as "fish" | "cat"}
          canViewPartner={Boolean(identity)}
          onSync={syncOwnedSession}
          sessions={history}
          onOpen={(selected) => {
            setSelectedHistorySession(selected);
            setView("historyDetail");
          }}
        />
        {false && (
          <>
            {history.length ? (
              history.map((s) => (
                <article className="history" key={s.id}>
                  <b>{typeLabels[s.questionType]}</b>
                  <span>
                    {new Date(s.startedAt).toLocaleDateString()} ·{" "}
                    {s.records.filter((x) => x.isCorrect).length}/
                    {s.questions.length} · {(s.accumulatedMs / 1000).toFixed(1)}
                    s
                  </span>
                </article>
              ))
            ) : (
              <p>还没有完成的训练记录。</p>
            )}
          </>
        )}
      </main>
    );
  }
  if (view === "stats") {
    return (
      <main className="panel">
        <button onClick={() => setView("home")}>← 首页</button>
        <h1>我的成绩</h1>
        <HistoryCharts
          sessions={history}
          userId={(identity?.role ?? user) as "fish" | "cat"}
        />
      </main>
    );
  }
  if (view === "historyDetail" && selectedHistorySession) {
    return (
      <main className="panel">
        <button onClick={() => setView("history")}>← 历史记录</button>
        <h1>训练详情</h1>
        <SessionDetails session={selectedHistorySession} />
      </main>
    );
  }
  return (
    <main className="home">
      {activeSessionPrompt && (
        <ActiveSessionDialog
          onCancel={() => setActiveSessionPrompt(null)}
          onContinue={continueActiveSession}
          onDiscard={discardActiveSession}
          session={activeSessionPrompt.session}
          showCancel={activeSessionPrompt.afterDiscard === "startNew"}
        />
      )}
      {storageError && (
        <p className="storageError" role="alert">
          {storageError}
        </p>
      )}
      <header>
        <div>
          <p>行测基础算力</p>
          <h1>鱼猫速算训练营</h1>
        </div>
        <div className="homeHeaderActions">
          <button
            onClick={async () => {
              try {
                const local = await readCompleted();
                const owned = identity
                  ? local.filter((item) => item.ownerAccountId === identity.id)
                  : local.filter((item) => !item.ownerAccountId);
                const cloud = identity
                  ? await readCloudHistory().catch(() => [])
                  : [];
                setHistory([
                  ...owned,
                  ...cloud.filter(
                    (item) =>
                      !owned.some((localItem) => localItem.id === item.id),
                  ),
                ]);
                setView("stats");
              } catch {
                setStorageError("成绩记录读取失败，请刷新后重试。");
              }
            }}
          >
            我的成绩
          </button>
          <button onClick={loadHistory}>历史记录</button>
        </div>
      </header>
      <AccountPanel identity={identity} onIdentity={changeIdentity} />
      {identity && unassignedHistory.length > 0 && (
        <section className="accountPanel">
          <p>
            此设备有 {unassignedHistory.length}{" "}
            条登录前本地记录，尚未归属任何账号。
          </p>
          <button
            onClick={async () => {
              await claimCompletedSessions(
                unassignedHistory.map((item) => item.id),
                identity.id,
              );
              await Promise.all(
                unassignedHistory.map((item) =>
                  syncCompleted({ ...item, ownerAccountId: identity.id }).catch(
                    () => false,
                  ),
                ),
              );
              setUnassignedHistory([]);
            }}
          >
            合并到当前{identity.role === "fish" ? "🐟" : "🐱"}账号
          </button>
          <button
            onClick={async () => {
              if (
                !window.confirm(
                  "确认仅从此设备移除这些未归属历史？云端数据不会变更。",
                )
              )
                return;
              await discardCompletedSessions(
                unassignedHistory.map((item) => item.id),
              );
              setUnassignedHistory([]);
            }}
          >
            丢弃本地历史
          </button>
        </section>
      )}
      {identity ? (
        <p className="boundIdentity">
          当前训练身份：{identity.role === "fish" ? "🐟 小鱼" : "🐱 小猫"}
          （账号已绑定）
        </p>
      ) : (
        <p className="boundIdentity localTrainingIdentity">
          未登录：仅本地训练，登录后由账号确定 🐟 / 🐱 身份。
        </p>
      )}
      <h2>选择训练题型</h2>
      <TrainingTypeSelector
        onDivisionRuleChange={setSubtype}
        onSelect={(selectedType, selectedSubtype) => {
          setType(selectedType);
          setSubtype(selectedSubtype);
        }}
        subtype={subtype}
        type={type}
      />
      <h2>题量</h2>
      <button
        aria-haspopup="dialog"
        className="questionCountTrigger"
        onClick={() => setIsQuestionCountDialogOpen(true)}
        type="button"
      >
        <span>当前题量</span>
        <strong>{count}题</strong>
        <small>点击选择快速、标准或自定义模式</small>
      </button>
      <button className="primary wide" onClick={start}>
        开始练习
      </button>
      <p className="hint">难度由系统混合生成；训练中离开页面会自动暂停。</p>
      {isQuestionCountDialogOpen && (
        <QuestionCountDialog
          initialCount={count}
          lastCustomCount={lastCustomCount}
          onCancel={() => setIsQuestionCountDialogOpen(false)}
          onConfirm={confirmQuestionCount}
        />
      )}
    </main>
  );
}
