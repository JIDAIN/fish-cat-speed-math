"use client";
import { useMemo, useState } from "react";
import {
  PKChallenge,
  pkOutcome,
  pkParticipantSummary,
  pkReason,
} from "@/lib/pk";
import { TrainingSession, subtypeLabels, typeLabels } from "@/lib/types";

const label = (role: "fish" | "cat") =>
  role === "fish" ? "🐟 小鱼" : "🐱 小猫";
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}秒`;
export function PKDetails({
  challenge,
  response,
}: {
  challenge: PKChallenge;
  response: TrainingSession;
}) {
  const [filter, setFilter] = useState<"all" | "wrong" | "different">("all");
  const challenger = pkParticipantSummary(challenge.frozenSession);
  const opponent = pkParticipantSummary(response);
  const outcome = pkOutcome(challenge, response);
  const rows = useMemo(
    () =>
      challenge.frozenSession.questions
        .map((question, index) => ({
          question,
          index,
          challenger: challenge.frozenSession.records[index],
          opponent: response.records[index],
        }))
        .filter((row) =>
          filter === "all" || filter === "wrong"
            ? !row.challenger?.isCorrect || !row.opponent?.isCorrect
            : row.challenger?.isCorrect !== row.opponent?.isCorrect,
        ),
    [challenge, response, filter],
  );
  return (
    <section className="pkDetails">
      <h1>PK结果详情</h1>
      <p>
        {typeLabels[challenge.frozenSession.questionType]} ·{" "}
        {subtypeLabels[challenge.frozenSession.subtype]} ·{" "}
        {challenge.frozenSession.questions.length}题
      </p>
      <h2>{outcome === "draw" ? "平局" : `${label(outcome)}胜`}</h2>
      <p>{pkReason(challenge, response)}</p>
      <div className="pkCompare">
        <p>
          <b>{label(challenge.challengerRole)}</b>
          <br />
          {challenger.correctCount}/{challenger.questionCount} ·{" "}
          {Math.round(challenger.accuracy * 100)}%<br />
          {seconds(challenge.frozenSession.accumulatedMs)} · 平均{" "}
          {seconds(challenger.averageMs)}
          <br />
          {challenger.rating}
        </p>
        <p>
          <b>{label(challenge.opponentRole)}</b>
          <br />
          {opponent.correctCount}/{opponent.questionCount} ·{" "}
          {Math.round(opponent.accuracy * 100)}%<br />
          {seconds(response.accumulatedMs)} · 平均 {seconds(opponent.averageMs)}
          <br />
          {opponent.rating}
        </p>
      </div>
      <small>
        发起：{new Date(challenge.createdAt).toLocaleString("zh-CN")} · 完成：
        {new Date(challenge.completedAt!).toLocaleString("zh-CN")}
      </small>
      <div className="pkFilter">
        <button
          className={filter === "all" ? "selected" : ""}
          onClick={() => setFilter("all")}
        >
          全部
        </button>
        <button
          className={filter === "wrong" ? "selected" : ""}
          onClick={() => setFilter("wrong")}
        >
          仅看错题
        </button>
        <button
          className={filter === "different" ? "selected" : ""}
          onClick={() => setFilter("different")}
        >
          结果不同
        </button>
      </div>
      <ol className="pkQuestionRows">
        {rows.map((row) => (
          <li
            key={row.question.id}
            className={
              !row.challenger?.isCorrect || !row.opponent?.isCorrect
                ? "pkDifference"
                : ""
            }
          >
            <b>
              {row.index + 1}. {row.question.prompt}
            </b>
            <span>正确答案：{row.question.answer}</span>
            <span>
              {label(challenge.challengerRole)}：
              {row.challenger?.userAnswer || "—"}{" "}
              {row.challenger?.isCorrect ? "✓" : "×"} ·{" "}
              {seconds(row.challenger?.timeUsedMs ?? 0)}
            </span>
            <span>
              {label(challenge.opponentRole)}：{row.opponent?.userAnswer || "—"}{" "}
              {row.opponent?.isCorrect ? "✓" : "×"} ·{" "}
              {seconds(row.opponent?.timeUsedMs ?? 0)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
