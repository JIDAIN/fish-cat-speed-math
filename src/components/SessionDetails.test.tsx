import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("separates the verdict and correct result without showing legacy restarts", () => {
    const { container } = render(<QuestionDetails session={session} />);
    expect(screen.getByText("正确结果")).toBeTruthy();
    expect(screen.getAllByText("15")).toHaveLength(2);
    expect(screen.queryByText("重开")).toBeNull();
    expect(screen.queryByText("2次")).toBeNull();
    expect(container.querySelectorAll(".questionTableHead span")).toHaveLength(
      6,
    );
    expect(container.querySelectorAll(".questionRow span")).toHaveLength(6);
  });

  it("shows an exact two-decimal quotient for three-percent review", () => {
    const estimateSession: TrainingSession = {
      ...session,
      questionType: "three_by_two_division",
      subtype: "quotient_estimate_3_percent",
      records: [
        {
          ...session.records[0],
          question: {
            ...session.records[0].question,
            type: "three_by_two_division",
            subtype: "quotient_estimate_3_percent",
            prompt: "523÷47",
            answer: "11",
            acceptedRange: { min: 10.8, max: 11.46 },
            data: { a: 523, b: 47, quotient: 523 / 47 },
          },
          userAnswer: "11.2",
          isCorrect: true,
          accuracyLevel: "accepted",
        },
      ],
    };

    render(<QuestionDetails session={estimateSession} />);
    expect(screen.getByText("11.13")).toBeTruthy();
    expect(screen.queryByText("10.8–11.46")).toBeNull();
  });

  it("opens the same temporary scratch canvas for result review", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<QuestionDetails session={session} />);

    fireEvent.click(screen.getByRole("button", { name: "打开复盘草稿" }));
    expect(screen.getByText("完成草稿")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "完成草稿" }));
    expect(screen.queryByText("完成草稿")).toBeNull();
  });
});
