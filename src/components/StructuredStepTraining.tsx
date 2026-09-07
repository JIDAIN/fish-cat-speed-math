"use client";

import { StructuredAnswerInput } from "./StructuredAnswerInput";
import { currentSessionStepElapsedMs } from "@/lib/timer";
import { TrainingSession } from "@/lib/types";

type StructuredStepTrainingProps = {
  session: TrainingSession;
  now: number;
  isRestarting: boolean;
  onChange: (session: TrainingSession) => void;
  onSubmit: () => void;
  onRestart: () => void;
};

export function StructuredStepTraining({
  session,
  now,
  isRestarting,
  onChange,
  onSubmit,
  onRestart,
}: StructuredStepTrainingProps) {
  const question = session.questions[session.currentIndex];
  const stepIndex = session.currentStepIndex ?? 0;
  const step = question?.stepSpecs?.[stepIndex];
  if (!question || !step) return null;

  return (
    <section className="structuredStepTraining" aria-label="分步训练">
      <h1>{question.prompt}</h1>
      <p className="rule">
        步骤 {stepIndex + 1}/{question.stepSpecs?.length ?? 0} · 本步
        {(currentSessionStepElapsedMs(session, now) / 1000).toFixed(1)} 秒
      </p>
      <h2>{step.prompt}</h2>
      <StructuredAnswerInput
        ariaLabel={`步骤${stepIndex + 1}答案`}
        choices={step.choices}
        kind={step.inputKind === "steps" ? "number" : step.inputKind}
        onChange={(value) =>
          onChange({
            ...session,
            currentStepAnswer: value,
            currentStepEditCount: (session.currentStepEditCount ?? 0) + 1,
          })
        }
        value={session.currentStepAnswer ?? ""}
      />
      <div className="comparisonActions">
        <button
          className="restartTrainingButton"
          disabled={isRestarting}
          onClick={onRestart}
          type="button"
        >
          {isRestarting ? "正在重开…" : "重开训练"}
        </button>
        <button
          className="primary"
          disabled={!session.currentStepAnswer}
          onClick={onSubmit}
          type="button"
        >
          确认本步骤
        </button>
      </div>
    </section>
  );
}
