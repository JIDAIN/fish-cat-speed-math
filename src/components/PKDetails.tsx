"use client";

import { useMemo } from "react";
import { PKChallenge } from "@/lib/pk";
import {
  QuestionRecord,
  TrainingSession,
  getSubtypeLabel,
  typeLabels,
} from "@/lib/types";

const label = (role: "fish" | "cat") =>
  role === "fish" ? "🐟 小鱼" : "🐱 小猫";
const seconds = (milliseconds?: number) =>
  milliseconds === undefined ? "—" : `${(milliseconds / 1000).toFixed(1)}秒`;

function recordsByQuestionId(records: QuestionRecord[]) {
  return new Map(records.map((record) => [record.question.id, record]));
}

function AnswerLine({
  role,
  record,
}: {
  role: "fish" | "cat";
  record?: QuestionRecord;
}) {
  if (!record)
    return (
      <span className="pkAnswer pkAnswerMissing">
        {label(role)}：未作答 · —
      </span>
    );
  return (
    <span
      className={
        record.isCorrect ? "pkAnswer pkAnswerCorrect" : "pkAnswer pkAnswerWrong"
      }
    >
      {label(role)}：{record.userAnswer || "未作答"}{" "}
      {record.isCorrect ? "✓" : "×"} · {seconds(record.timeUsedMs)}
    </span>
  );
}

/** The detail page intentionally contains no result summary: it is a complete, frozen-order answer review. */
export function PKDetails({
  challenge,
  response,
}: {
  challenge: PKChallenge;
  response: TrainingSession;
}) {
  const rows = useMemo(() => {
    const challengerRecords = recordsByQuestionId(
      challenge.frozenSession.records,
    );
    const opponentRecords = recordsByQuestionId(response.records);
    return challenge.frozenSession.questions.map((question, index) => {
      // PK responses preserve IDs. The guarded index fallback helps legacy
      // data, but never shifts a later answer onto a missing frozen question.
      const challengerFallback = challenge.frozenSession.records[index];
      const opponentFallback = response.records[index];
      const challenger =
        challengerRecords.get(question.id) ??
        (challengerFallback?.question.id === question.id
          ? challengerFallback
          : undefined);
      const opponent =
        opponentRecords.get(question.id) ??
        (opponentFallback?.question.id === question.id
          ? opponentFallback
          : undefined);
      const bothCorrect =
        challenger?.isCorrect === true && opponent?.isCorrect === true;
      const oneCorrect =
        challenger?.isCorrect !== opponent?.isCorrect &&
        Boolean(challenger && opponent);
      const bothWrong =
        challenger && opponent && !challenger.isCorrect && !opponent.isCorrect;
      return {
        question,
        index,
        challenger,
        opponent,
        showCorrectAnswer: !bothCorrect,
        className: oneCorrect
          ? "pkOneCorrect"
          : bothWrong
            ? "pkBothWrong"
            : !challenger || !opponent
              ? "pkMissing"
              : "",
      };
    });
  }, [challenge, response]);

  return (
    <section className="pkDetails">
      <h1>PK逐题详情</h1>
      <p>
        {typeLabels[challenge.frozenSession.questionType]} ·{" "}
        {getSubtypeLabel(
          challenge.frozenSession.questionType,
          challenge.frozenSession.subtype,
        )}{" "}
        · {challenge.frozenSession.questions.length}题
      </p>
      <p className="pkParticipants">
        {label(challenge.challengerRole)} 与 {label(challenge.opponentRole)}
      </p>
      <ol className="pkQuestionRows" aria-label="PK完整逐题作答">
        {rows.map((row) => (
          <li className={row.className} key={row.question.id}>
            <b>
              {row.index + 1}. {row.question.prompt}
            </b>
            <AnswerLine
              role={challenge.challengerRole}
              record={row.challenger}
            />
            <AnswerLine role={challenge.opponentRole} record={row.opponent} />
            {row.showCorrectAnswer && (
              <span className="pkCorrectAnswer">
                正确答案：{row.question.answer}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
