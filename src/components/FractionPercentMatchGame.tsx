"use client";

import { useEffect, useRef, useState } from "react";
import {
  createMatchRecord,
  createMatchRounds,
  FractionPercentMatchRecord,
  MatchCard,
} from "@/lib/fraction-percent-match";

function Fraction({ card }: { card: MatchCard }) {
  return (
    <span aria-label={card.label} className="matchFraction">
      <span>{card.numerator}</span>
      <span>{card.denominator}</span>
    </span>
  );
}
const displayTime = (milliseconds: number) =>
  `${Math.floor(milliseconds / 60000)
    .toString()
    .padStart(
      2,
      "0",
    )}:${((milliseconds % 60000) / 1000).toFixed(1).padStart(4, "0")}`;

export function FractionPercentMatchGame({
  userId,
  ownerAccountId,
  onComplete,
  onHome,
  onHistory,
}: {
  userId: "fish" | "cat";
  ownerAccountId?: string;
  onComplete: (record: FractionPercentMatchRecord) => Promise<void> | void;
  onHome: () => void;
  onHistory: () => void;
}) {
  const [rounds, setRounds] = useState(() => createMatchRounds());
  const [roundIndex, setRoundIndex] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<MatchCard>();
  const [feedback, setFeedback] = useState<"correct" | "wrong">();
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const accumulated = useRef(0);
  const runningSince = useRef<number | null>(Date.now());
  const startedAt = useRef(Date.now());
  const completed = useRef(false);
  const transition = useRef<number | undefined>(undefined);
  const current = rounds[roundIndex];
  const nowElapsed = () =>
    accumulated.current +
    (runningSince.current === null ? 0 : Date.now() - runningSince.current);
  const pause = () => {
    if (runningSince.current !== null) {
      accumulated.current = nowElapsed();
      runningSince.current = null;
      setElapsed(accumulated.current);
    }
    setPaused(true);
  };
  const resume = () => {
    if (!complete && !document.hidden) {
      runningSince.current = Date.now();
      setPaused(false);
    }
  };
  useEffect(() => {
    const interval = window.setInterval(() => setElapsed(nowElapsed()), 100);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const visibility = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  });
  useEffect(() => () => window.clearTimeout(transition.current), []);

  const restart = () => {
    window.clearTimeout(transition.current);
    setRounds(createMatchRounds());
    setRoundIndex(0);
    setMatched(new Set());
    setSelected(undefined);
    setFeedback(undefined);
    setComplete(false);
    accumulated.current = 0;
    startedAt.current = Date.now();
    runningSince.current = Date.now();
    setElapsed(0);
    setPaused(false);
    completed.current = false;
  };
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    accumulated.current = nowElapsed();
    runningSince.current = null;
    setElapsed(accumulated.current);
    setComplete(true);
    void onComplete(
      createMatchRecord({
        userId,
        ownerAccountId,
        startedAt: startedAt.current,
        completedAt: Date.now(),
        totalTimeMs: accumulated.current,
      }),
    );
  };
  const choose = (card: MatchCard) => {
    if (paused || complete || matched.has(card.id) || feedback) return;
    if (!selected) {
      setSelected(card);
      return;
    }
    if (selected.kind === card.kind) {
      setSelected(card);
      return;
    }
    if (selected.relationKey === card.relationKey) {
      setFeedback("correct");
      setMatched((old) => new Set([...old, selected.id, card.id]));
      setSelected(undefined);
      const finishedRound = matched.size + 2 === 16;
      transition.current = window.setTimeout(() => {
        setFeedback(undefined);
        if (finishedRound) {
          if (roundIndex === 3) finish();
          else {
            setRoundIndex((index) => index + 1);
            setMatched(new Set());
          }
        }
      }, 420);
    } else {
      setFeedback("wrong");
      transition.current = window.setTimeout(() => {
        setFeedback(undefined);
        setSelected(undefined);
      }, 420);
    }
  };
  if (complete)
    return (
      <section className="fractionMatchGame">
        <div className="matchNav">
          <button onClick={onHome}>← 首页</button>
          <button onClick={onHistory}>历史记录</button>
        </div>
        <div className="matchComplete">
          <h1>全部完成</h1>
          <strong>总用时：{(elapsed / 1000).toFixed(1)} 秒</strong>
          <button className="primary wide" onClick={restart}>
            再来一轮
          </button>
          <button onClick={onHistory}>查看历史</button>
          <button onClick={onHome}>返回首页</button>
        </div>
      </section>
    );
  return (
    <section className="fractionMatchGame" aria-label="百分互换消消乐">
      <div className="matchNav">
        <button onClick={onHome}>← 首页</button>
        <button onClick={onHistory}>历史记录</button>
      </div>
      <div className="matchStatus">
        <strong>{displayTime(elapsed)}</strong>
        <span>
          第 {roundIndex + 1} / 4 局 · 剩余 {8 - matched.size / 2} 对
        </span>
      </div>
      <div
        className={`matchBoard ${paused ? "isPaused" : ""}`}
        aria-label="4乘4配对棋盘"
      >
        {current.map((card) => (
          <button
            aria-label={card.label}
            aria-pressed={selected?.id === card.id}
            className={`matchCard ${card.kind} ${selected?.id === card.id ? "selected" : ""} ${matched.has(card.id) ? "matched" : ""} ${feedback === "wrong" && selected?.id === card.id ? "wrong" : ""}`}
            disabled={paused || matched.has(card.id)}
            key={card.id}
            onClick={() => choose(card)}
          >
            {card.kind === "fraction" ? <Fraction card={card} /> : card.label}
          </button>
        ))}
      </div>
      <button
        className="matchPause"
        onClick={() => (paused ? resume() : pause())}
      >
        {paused ? "继续" : "暂停"}
      </button>
      {paused && <p className="matchPaused">已暂停</p>}
    </section>
  );
}
