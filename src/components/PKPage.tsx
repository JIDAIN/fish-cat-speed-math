"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PKChallenge,
  isWithinLastSevenNaturalDays,
  paginate,
  pkOutcome,
  pkParticipantSummary,
} from "@/lib/pk";
import { getSubtypeLabel, TrainingSession, typeLabels } from "@/lib/types";

const label = (role: "fish" | "cat") =>
  role === "fish" ? "🐟 小鱼" : "🐱 小猫";
const time = (ms: number) => `${(ms / 1000).toFixed(1)}秒`;

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="pager" aria-label="分页">
      <span>
        第 {page} 页 / 共 {totalPages} 页
      </span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        上一页
      </button>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        下一页
      </button>
    </nav>
  );
}

export function PKPage({
  challenges,
  identityId,
  sessions,
  onStart,
  onContinue,
  onOpen,
  onRefresh,
}: {
  challenges: PKChallenge[];
  identityId: string;
  sessions: TrainingSession[];
  onStart: (challenge: PKChallenge) => void;
  onContinue: (challenge: PKChallenge, session: TrainingSession) => void;
  onOpen: (challenge: PKChallenge) => void;
  onRefresh: () => void;
}) {
  const [resultPage, setResultPage] = useState(1);
  const localActive = sessions.find(
    (s) =>
      s.status === "active" &&
      s.ownerAccountId === identityId &&
      s.pkChallengeId,
  );
  const mine = challenges.filter(
    (challenge) =>
      challenge.opponentId === identityId && challenge.status === "pending",
  );
  const waiting = challenges.filter(
    (challenge) =>
      challenge.challengerId === identityId && challenge.status === "pending",
  );
  const completed = useMemo(
    () =>
      challenges
        .filter(
          (challenge) =>
            challenge.status === "completed" &&
            challenge.completedAt &&
            isWithinLastSevenNaturalDays(challenge.completedAt),
        )
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [challenges],
  );
  const resultPagination = paginate(completed, resultPage, 10);
  useEffect(() => {
    if (resultPagination.page !== resultPage)
      setResultPage(resultPagination.page);
  }, [resultPage, resultPagination.page]);

  const responseFor = (challenge: PKChallenge) =>
    sessions.find((session) => session.id === challenge.opponentSessionId);
  return (
    <section className="pkPage">
      <div className="pkTitle">
        <h1>PK挑战</h1>
        <button onClick={onRefresh}>刷新</button>
      </div>
      <h2>待我处理</h2>
      {mine.length || localActive ? (
        <div className="pkCards">
          {localActive &&
            (() => {
              const challenge = challenges.find(
                (c) => c.id === localActive.pkChallengeId,
              );
              return challenge ? (
                <article className="pkCard active" key={challenge.id}>
                  <b>进行中的挑战</b>
                  <p>
                    {label(challenge.challengerRole)} ·{" "}
                    {typeLabels[challenge.frozenSession.questionType]} ·{" "}
                    {getSubtypeLabel(
                      challenge.frozenSession.questionType,
                      challenge.frozenSession.subtype,
                    )}{" "}
                    · {challenge.frozenSession.questions.length}题
                  </p>
                  <p>
                    当前进度：{localActive.records.length}/
                    {localActive.questions.length}
                  </p>
                  <button
                    className="primary"
                    onClick={() => onContinue(challenge, localActive)}
                  >
                    继续挑战
                  </button>
                </article>
              ) : null;
            })()}
          {mine
            .filter((c) => c.id !== localActive?.pkChallengeId)
            .map((challenge) => (
              <article className="pkCard" key={challenge.id}>
                <b>{label(challenge.challengerRole)} 发起挑战</b>
                <p>
                  {typeLabels[challenge.frozenSession.questionType]} ·{" "}
                  {getSubtypeLabel(
                    challenge.frozenSession.questionType,
                    challenge.frozenSession.subtype,
                  )}{" "}
                  · {challenge.frozenSession.questions.length}题
                </p>
                <small>
                  {new Date(challenge.createdAt).toLocaleString("zh-CN")}
                </small>
                <button className="primary" onClick={() => onStart(challenge)}>
                  开始挑战
                </button>
              </article>
            ))}
        </div>
      ) : (
        <p className="emptyHistory">暂无待处理挑战。</p>
      )}
      <h2>等待对方</h2>
      {waiting.length ? (
        <div className="pkCards">
          {waiting.map((challenge) => (
            <article className="pkCard" key={challenge.id}>
              <b>等待 {label(challenge.opponentRole)}</b>
              <p>
                {typeLabels[challenge.frozenSession.questionType]} ·{" "}
                {getSubtypeLabel(
                  challenge.frozenSession.questionType,
                  challenge.frozenSession.subtype,
                )}{" "}
                · {challenge.frozenSession.questions.length}题
              </p>
              <small>
                {new Date(challenge.createdAt).toLocaleString("zh-CN")} ·
                等待开始/完成
              </small>
            </article>
          ))}
        </div>
      ) : (
        <p className="emptyHistory">暂无等待对方的挑战。</p>
      )}
      <h2>近7日已完成</h2>
      {completed.length ? (
        <>
          <div className="pkCards">
            {resultPagination.items.map((challenge) => {
              const response = responseFor(challenge);
              if (!response)
                return (
                  <article className="pkCard" key={challenge.id}>
                    <p>PK结果正在同步，请稍后刷新。</p>
                  </article>
                );
              const challenger = pkParticipantSummary(challenge.frozenSession);
              const opponent = pkParticipantSummary(response);
              const outcome = pkOutcome(challenge, response);
              return (
                <article className="pkCard" key={challenge.id}>
                  <button
                    className="pkResultOpen"
                    onClick={() => onOpen(challenge)}
                  >
                    <b>
                      {typeLabels[challenge.frozenSession.questionType]} ·{" "}
                      {getSubtypeLabel(
                        challenge.frozenSession.questionType,
                        challenge.frozenSession.subtype,
                      )}{" "}
                      · {challenge.frozenSession.questions.length}题
                    </b>
                    <p>
                      {label(challenge.challengerRole)}{" "}
                      {challenger.correctCount}/{challenger.questionCount} ·{" "}
                      {time(challenge.frozenSession.accumulatedMs)} ·{" "}
                      {challenger.rating}
                    </p>
                    <p>
                      {label(challenge.opponentRole)} {opponent.correctCount}/
                      {opponent.questionCount} · {time(response.accumulatedMs)}{" "}
                      · {opponent.rating}
                    </p>
                    <strong>
                      {outcome === "draw" ? "平局" : `${label(outcome)}胜`}
                    </strong>
                    <small>
                      最终完成：
                      {new Date(challenge.completedAt!).toLocaleString(
                        "zh-CN",
                      )}{" "}
                      · 查看详情
                    </small>
                  </button>
                </article>
              );
            })}
          </div>
          <Pager
            page={resultPagination.page}
            totalPages={resultPagination.totalPages}
            onPage={setResultPage}
          />
        </>
      ) : (
        <p className="emptyHistory">近7日暂无已完成PK。</p>
      )}
    </section>
  );
}
