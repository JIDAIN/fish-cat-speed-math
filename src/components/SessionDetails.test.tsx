import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionDetails } from "./SessionDetails";
import { TrainingSession } from "@/lib/types";

const session: TrainingSession = {
  id: "detail-session",
  userId: "fish",
  questionType: "two_digit_add_subtract",
  subtype: "standard",
  questionCount: 10,
  questions: [],
  currentIndex: 1,
  currentAnswer: "",
  currentRestartCount: 0,
  accumulatedMs: 3_000,
  pauseDurationMs: 0,
  runningSince: null,
  status: "completed",
  startedAt: 0,
  records: [
    {
      question: {
        id: "q1",
        type: "two_digit_add_subtract",
        subtype: "standard",
        prompt: "12+3",
        answer: "15",
        data: {},
        difficulty: { level: 3, tags: [] },
        primaryStructure: "test_structure",
        secondaryTags: [],
        generationRuleVersion: "test",
      },
      userAnswer: "15",
      isCorrect: true,
      accuracyLevel: "exact",
      timeUsedMs: 3_000,
      restartCount: 2,
      usedScratchpad: false,
    },
  ],
};

describe("QuestionDetails", () => {
  it("shows a stable aligned table including restart count", () => {
    const { container } = render(<QuestionDetails session={session} />);
    expect(screen.getByText("重开")).toBeTruthy();
    expect(screen.getByText("2次")).toBeTruthy();
    expect(container.querySelectorAll(".questionTableHead span")).toHaveLength(
      6,
    );
    expect(container.querySelectorAll(".questionRow span")).toHaveLength(6);
  });
});
