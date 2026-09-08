import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { generatePathComparisonSet } from "@/lib/batch8-training";
import { GenerationContext } from "@/lib/generate";
import { QuestionRecord, TrainingSession } from "@/lib/types";
import { SkillInsights } from "./SkillInsights";

afterEach(cleanup);

function context(): GenerationContext {
  let id = 0;
  return { random: () => 0.42, createId: () => `insight-${id++}` };
}

function completedPath(userId: "fish" | "cat", directMs: number, scaleMs: number): TrainingSession {
  const question = generatePathComparisonSet("L2", 1, context())[0];
  const steps = (question.stepSpecs ?? []).map((spec) => ({
    stepId: spec.id,
    stepSkillId: spec.stepSkillId,
    stepType: spec.stepType,
    userValue: spec.stepType === "path_preference" ? "direct" : spec.expectedValue,
    expectedValue: spec.expectedValue,
    decisionValue: spec.stepType === "path_preference" ? "direct" : undefined,
    isCorrect: true,
    durationMs:
      spec.stepType === "path_direct"
        ? directMs
        : spec.stepType === "path_scale"
          ? scaleMs
          : 1_500,
    submitCount: 1,
    editCount: 0,
    skipped: false,
    timingInterrupted: false,
  }));
  const record: QuestionRecord = {
    question,
    userAnswer: "direct",
    isCorrect: true,
    accuracyLevel: "exact",
    timeUsedMs: steps.reduce((sum, step) => sum + step.durationMs, 0),
    restartCount: 0,
    usedScratchpad: false,
    steps,
  };
  return {
    id: `path-${userId}`,
    userId,
    questionType: "skill_drill",
    subtype: "path_compare:L2",
    questionCount: 1,
    questions: [question],
    currentIndex: 1,
    records: [record],
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: record.timeUsedMs,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: 1,
    completedAt: 2,
    schemaVersion: 2,
    trainingMode: "path_compare",
    difficultyBand: "L2",
  };
}

describe("SkillInsights acceptance", () => {
  it("renders both Fish and Cat without inventing mastery when there is no data", () => {
    render(<SkillInsights sessions={[]} />);
    expect(screen.getByText("🐟 小鱼")).toBeTruthy();
    expect(screen.getByText("🐱 小猫")).toBeTruthy();
    expect(screen.getAllByText(/暂无可判断的专项数据/)).toHaveLength(2);
    expect(screen.getAllByText(/暂无对比记录/)).toHaveLength(2);
  });

  it("shows different fastest paths for Fish and Cat from their own records", () => {
    render(
      <SkillInsights
        sessions={[
          completedPath("fish", 700, 2_500),
          completedPath("cat", 3_000, 600),
        ]}
      />,
    );
    expect(screen.getByLabelText("🐟 小鱼同题路径对比").textContent).toContain(
      "当前个人最快：直除",
    );
    expect(screen.getByLabelText("🐱 小猫同题路径对比").textContent).toContain(
      "当前个人最快：除法补偿放缩",
    );
  });
});
