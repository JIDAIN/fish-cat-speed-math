import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StructuredSingleAnswerTraining } from "./StructuredSingleAnswerTraining";
import { TrainingSession } from "@/lib/types";

const baseSession: TrainingSession = {
  id: "structured-single",
  userId: "fish",
  questionType: "skill_drill",
  subtype: "skill:A-FRA-01:L2",
  questionCount: 10,
  questions: [
    {
      id: "q1",
      type: "skill_drill",
      subtype: "skill_drill",
      prompt: "1/7 最接近多少？",
      answer: "14.3",
      data: {
        choiceValues: ["12.5", "14.3", "16.7", "20"],
        choiceLabels: ["12.5%", "14.3%", "16.7%", "20%"],
      },
      difficulty: { level: 3, tags: [] },
      primaryStructure: "fraction_to_percent",
      secondaryTags: [],
      generationRuleVersion: "test",
      skillId: "A-FRA-01",
      difficultyBand: "L2",
      masteryProfile: "R",
      inputKind: "choice",
      allowedAnswerSet: ["14.3"],
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
    fireEvent.click(screen.getByRole("button", { name: "14.3%" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "14.3" }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currentAnswer: "14.3" }),
    );
  });

  it("keeps generic method-block composition editable until explicit confirmation", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const session: TrainingSession = {
      ...baseSession,
      subtype: "skill_drill",
      questions: [
        {
          ...baseSession.questions[0],
          subtype: "skill_drill",
          skillId: undefined,
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
