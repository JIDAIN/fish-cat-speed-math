import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StructuredSingleAnswerTraining } from "./StructuredSingleAnswerTraining";
import { TrainingSession } from "@/lib/types";

const baseSession: TrainingSession = {
  id: "structured-single",
  userId: "fish",
  questionType: "skill_drill",
  subtype: "skill:B-R-05:L2",
  questionCount: 10,
  questions: [
    {
      id: "q1",
      type: "skill_drill",
      subtype: "skill_drill",
      prompt: "分母变大，商应怎样修正？",
      answer: "down",
      data: {
        choiceValues: ["up", "down"],
        choiceLabels: ["向上修正", "向下修正"],
      },
      difficulty: { level: 3, tags: [] },
      primaryStructure: "direction",
      secondaryTags: [],
      generationRuleVersion: "test",
      skillId: "B-R-05",
      difficultyBand: "L2",
      masteryProfile: "D",
      inputKind: "choice",
      allowedAnswerSet: ["down"],
    },
  ],
  currentIndex: 0,
  records: [],
  currentAnswer: "",
  currentRestartCount: 0,
  accumulatedMs: 0,
  runningSince: 1,
  pauseDurationMs: 0,
  status: "active",
  startedAt: 1,
};

afterEach(cleanup);

describe("StructuredSingleAnswerTraining", () => {
  it("submits semantic choice values immediately instead of asking for keypad codes", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <StructuredSingleAnswerTraining
        isRestarting={false}
        onChange={onChange}
        onRestart={vi.fn()}
        onSubmit={onSubmit}
        session={baseSession}
      />,
    );
    expect(screen.queryByText(/1=/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "向下修正" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "down" }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "down" }),
    );
  });

  it("keeps percentage-block composition editable until explicit confirmation", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const session: TrainingSession = {
      ...baseSession,
      subtype: "skill:B-PSPLIT-01:L2",
      questions: [
        {
          ...baseSession.questions[0],
          skillId: "B-PSPLIT-01",
          prompt: "把17%拆成基础百分比块",
          answer: "10,5,2",
          inputKind: "percent_blocks",
          allowedAnswerSet: ["10,5,2"],
          data: {},
        },
      ],
    };
    render(
      <StructuredSingleAnswerTraining
        isRestarting={false}
        onChange={onChange}
        onRestart={vi.fn()}
        onSubmit={onSubmit}
        session={session}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "10%" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "10" }),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
