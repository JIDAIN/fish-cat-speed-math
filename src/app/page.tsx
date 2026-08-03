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
  readActive,
  readCompleted,
  saveSession,
} from "@/lib/storage";
import { NumberPad } from "@/components/NumberPad";
import { ScratchCanvas } from "@/components/ScratchCanvas";
import { HistoryCharts } from "@/components/HistoryCharts";
import { HistoryList } from "@/components/HistoryList";
import { QuestionDetails, SessionDetails } from "@/components/SessionDetails";
import { ActiveSessionDialog } from "@/components/ActiveSessionDialog";
import {
  QuestionCountDialog,
  QuestionCountSelection,
} from "@/components/QuestionCountDialog";
import {
  DEFAULT_CUSTOM_QUESTION_COUNT,
  isValidQuestionCount,
  STANDARD_QUESTION_COUNT,
} from "@/lib/question-count";
import { getRating, sessionMetrics } from "@/lib/statistics";
import {
  currentElapsedMs,
  pauseSessionTimer,
  resumeSessionTimer,
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
const users = [
  { id: "fish", name: "🐟 小鱼" },
  { id: "cat", name: "🐱 小猫" },
];

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

export default function Home() {
  const [view, setView] = useState<
    "home" | "training" | "result" | "history" | "stats" | "historyDetail"
  >("home");
  const [user, setUser] = useState("fish");
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
  const [isRestartingTraining, setIsRestartingTraining] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    readActive()
      .then((activeSession) => {
        if (!activeSession) return;
        setActiveSessionPrompt({
          session: activeSession,
          afterDiscard: "startNew",
        });
      })
      .catch(() => setStorageError("本地训练记录读取失败，请刷新后重试。"));
  }, []);
  useEffect(() => {
    if (session?.status === "active") {
      saveSession(session).catch(() =>
        setStorageError("训练暂存失败，请保持页面打开并刷新后重试。"),
      );
    }
  }, [session]);
  useEffect(() => {
    const pause = () =>
      setSession((activeSession) =>
        activeSession ? pauseSessionTimer(activeSession) : activeSession,
      );
    const resume = () =>
      setSession((activeSession) =>
        activeSession && view === "training"
          ? resumeSessionTimer(activeSession)
          : activeSession,
      );
    const v = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, [view]);
  const elapsed = session ? currentElapsedMs(session, now) : 0;
  const current = session?.questions[session.currentIndex];
  const beginNewSession = () => {
    if (!isValidQuestionCount(count)) {
      setStorageError("题量无效，请重新选择 10～100 题。");
      return;
    }
    const s = createTrainingSession({
      userId: user,
      questionType: type,
      subtype,
      questionCount: count,
    });
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
        session?.status === "active" ? session : await readActive();
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
  const continueActiveSession = () => {
    if (!activeSessionPrompt) return;
    setSession(resumeSessionTimer(activeSessionPrompt.session));
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
      setSession(next);
      saveSession(next).catch(() =>
        setStorageError("本次训练已完成，但本地保存失败，请刷新后重试。"),
      );
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
        questionType: session.questionType,
        subtype: session.subtype,
        questionCount: session.questionCount,
      });
      // saveSession replaces every older active record in one transaction, so
      // there is never a recoverable half-restarted state.
      await saveSession(replacement);
      setScratch(false);
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
      setHistory(await readCompleted());
      setView("history");
    } catch {
      setStorageError("历史记录读取失败，请刷新后重试。");
    }
  };
  if (view === "training" && session && current)
    return (
      <main className="trainingPage">
        <header className="trainingHeader">
          <button
            onClick={() => {
              const pausedSession = pauseSessionTimer(session);
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
          <p className="rule">
            {session.subtype === "quotient_first"
              ? "求商首位，不四舍五入"
              : session.subtype === "quotient_two"
                ? "求商前两位，不四舍五入"
                : session.subtype === "comparison"
                  ? "请选择两个分数的大小关系"
                  : "请输入答案"}
          </p>
          {session.questionType === "fraction_comparison" ? (
            <FractionComparisonDisplay
              data={current.data}
              fallbackPrompt={current.prompt}
              selectedRelation={session.currentAnswer}
            />
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
                  { label: "等于", value: "=" },
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
            <div className="optionPad trainingKeypad">
              {(Array.isArray(current.data.options)
                ? current.data.options
                : []
              ).map((option) => (
                <button
                  className={session.currentAnswer === option ? "selected" : ""}
                  key={option}
                  onClick={() =>
                    setSession({ ...session, currentAnswer: option })
                  }
                >
                  {option}
                </button>
              ))}
              <button
                className="primary"
                disabled={!session.currentAnswer}
                onClick={submit}
              >
                确定
              </button>
            </div>
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
    const rating = getRating(session);
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
        <p className="rating">
          本次评级：<strong>{rating}</strong>
        </p>
        <QuestionDetails session={session} />
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
        <HistoryCharts sessions={history} />
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
                setHistory(await readCompleted());
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
      <section className="userbar">
        {users.map((u) => (
          <button
            className={u.id === user ? "selected" : ""}
            key={u.id}
            onClick={() => setUser(u.id)}
          >
            {u.name}
          </button>
        ))}
      </section>
      <h2>选择训练题型</h2>
      <div className="grid">
        {(Object.keys(typeLabels) as QuestionType[]).map((t) => (
          <button
            className={type === t ? "selected" : ""}
            key={t}
            onClick={() => {
              setType(t);
              setSubtype(defaultSubtype(t));
            }}
          >
            {typeLabels[t]}
          </button>
        ))}
      </div>
      {type === "three_by_two_division" && (
        <div className="modes">
          <button
            className={subtype === "quotient_first" ? "selected" : ""}
            onClick={() => setSubtype("quotient_first")}
          >
            求商首位
          </button>
          <button
            className={subtype === "quotient_two" ? "selected" : ""}
            onClick={() => setSubtype("quotient_two")}
          >
            求商前两位
          </button>
        </div>
      )}
      {type === "fraction_percent_conversion" && (
        <div className="modes">
          <button
            className={subtype === "fraction_to_percent" ? "selected" : ""}
            onClick={() => setSubtype("fraction_to_percent")}
          >
            分数转百分数
          </button>
          <button
            className={subtype === "percent_to_fraction" ? "selected" : ""}
            onClick={() => setSubtype("percent_to_fraction")}
          >
            百分数转分数
          </button>
        </div>
      )}
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
