"use client";

import { StructuredAnswerInput, StructuredChoice } from "./StructuredAnswerInput";
import { TrainingSession } from "@/lib/types";

type StructuredSingleAnswerTrainingProps = {
  session: TrainingSession;
  isRestarting: boolean;
  onChange: (session: TrainingSession) => void;
  onSubmit: (session: TrainingSession) => void;
  onRestart: () => void;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function questionChoices(session: TrainingSession): StructuredChoice[] {
  const question = session.questions[session.currentIndex];
  if (!question) return [];
  const values = stringArray(question.data.choiceValues);
  const labels = stringArray(question.data.choiceLabels);
  if (values.length && values.length === labels.length)
    return values.map((value, index) => ({ value, label: labels[index] }));
  return (question.allowedAnswerSet ?? []).map((value) => ({
    value: String(value),
    label: String(value),
  }));
}

export function StructuredSingleAnswerTraining({
  session,
  isRestarting,
  onChange,
  onSubmit,
  onRestart,
}: StructuredSingleAnswerTrainingProps) {
  const question = session.questions[session.currentIndex];
  if (
    !question ||
    (question.inputKind !== "choice" &&
      question.inputKind !== "sequence" &&
      question.inputKind !== "percent_blocks")
  )
    return null;

  const commitsImmediately =
    question.inputKind === "choice" || question.inputKind === "sequence";
  const choices = questionChoices(session);
  const updateAnswer = (value: string) => {
    onChange({ ...session, currentAnswer: value });
  };
  const commitAnswer = (value: string) => {
    onSubmit({ ...session, currentAnswer: value });
  };

  return (
    <section className="structuredSingleTraining" aria-label="结构化专项作答">
      <h1>{question.prompt}</h1>
      <p className="rule">
        {question.inputKind === "choice"
          ? "点选答案后自动进入下一题"
          : question.inputKind === "sequence"
            ? "点选更省操作的完整顺序后自动进入下一题"
            : "按顺序点击百分比块，组合完成后确认"}
      </p>
      <StructuredAnswerInput
        ariaLabel="结构化答案"
        choices={choices}
        kind={question.inputKind}
        onChange={updateAnswer}
        onCommit={commitsImmediately ? commitAnswer : undefined}
        value={session.currentAnswer}
      />
      <div className="structuredSingleActions">
        <button
          className="restartTrainingButton"
          disabled={isRestarting}
          onClick={onRestart}
          type="button"
        >
          {isRestarting ? "正在重开…" : "重开训练"}
        </button>
        {question.inputKind === "percent_blocks" ? (
          <button
            className="primary"
            disabled={!session.currentAnswer}
            onClick={() => onSubmit(session)}
            type="button"
          >
            确认组合
          </button>
        ) : null}
      </div>
    </section>
  );
}
