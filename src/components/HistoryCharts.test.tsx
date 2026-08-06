import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrainingSession } from "@/lib/types";
import { HistoryCharts } from "./HistoryCharts";

vi.mock("./TrendChart", () => ({
  TrendChart: ({ points }: { points: Array<{ sessionCount: number }> }) => (
    <output
      className="trend-chart-test-double"
      data-covered={points.reduce((sum, point) => sum + point.sessionCount, 0)}
      data-points={points.length}
    />
  ),
}));

function makeSession(
  id: string,
  overrides: Partial<TrainingSession> = {},
): TrainingSession {
  const questions = Array.from({ length: 20 }, (_, index) => ({
    id: `${id}-${index}`,
  })) as TrainingSession["questions"];
  return {
    id,
    userId: "fish",
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: questions.length,
    questions,
    currentIndex: questions.length,
    records: questions.map((question) => ({
      question,
      userAnswer: "1",
      isCorrect: true,
      accuracyLevel: "exact",
      timeUsedMs: 1_000,
      restartCount: 0,
      usedScratchpad: false,
    })),
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 20_000,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: Number(id.replace(/\D/g, "")) || 1,
    ...overrides,
  };
}

function trackFor(container: HTMLElement, title: string) {
  const titleElement = [...container.querySelectorAll(".trackTitle h3")].find(
    (element) => element.textContent === title,
  );
  const track = titleElement?.closest<HTMLElement>(".trackCharts");
  if (!track) throw new Error(`missing ${title} track`);
  return track;
}

describe("HistoryCharts", () => {
  it("shows every type/submode track with fish and cat side by side", () => {
    const { container } = render(
      <HistoryCharts
        sessions={[makeSession("fish"), makeSession("cat", { userId: "cat" })]}
      />,
    );

    const tracks = container.querySelectorAll(".trackCharts");
    expect(tracks).toHaveLength(12);
    for (const track of tracks) {
      expect(track.querySelectorAll(".userChart")).toHaveLength(2);
    }

    const addSubtract = trackFor(container, "两位数加减");
    const charts = addSubtract.querySelectorAll<HTMLOutputElement>(
      ".trend-chart-test-double",
    );
    expect(charts[0].dataset.covered).toBe("1");
    expect(charts[1].dataset.covered).toBe("1");
  });

  it("defaults ordinary tracks to 20 questions and fraction tracks to 10", () => {
    const { container } = render(<HistoryCharts sessions={[]} />);

    expect(
      trackFor(container, "两位数加减").querySelector<HTMLSelectElement>(
        "select",
      )?.value,
    ).toBe("20");
    expect(
      trackFor(container, "分数—百分数").querySelector<HTMLSelectElement>(
        "select",
      )?.value,
    ).toBe("10");
    expect(
      trackFor(container, "分数比大小").querySelector<HTMLSelectElement>(
        "select",
      )?.value,
    ).toBe("10");
  });

  it("keeps 20, 30 and 40 question trends separate and selectable", () => {
    const sessions = [
      makeSession("twenty"),
      makeSession("thirty", withQuestionCount(30)),
      makeSession("forty", withQuestionCount(40)),
    ];
    const { container } = render(<HistoryCharts sessions={sessions} />);
    const addSubtract = trackFor(container, "两位数加减");
    const picker = addSubtract.querySelector<HTMLSelectElement>("select");
    if (!picker) throw new Error("question-count picker is missing");

    expect([...picker.options].map((option) => option.value)).toEqual([
      "20",
      "30",
      "40",
    ]);
    expect(
      addSubtract.querySelector<HTMLOutputElement>(".trend-chart-test-double")
        ?.dataset.covered,
    ).toBe("1");

    fireEvent.change(picker, { target: { value: "40" } });
    expect(picker.value).toBe("40");
    expect(
      addSubtract.querySelector<HTMLOutputElement>(".trend-chart-test-double")
        ?.dataset.covered,
    ).toBe("1");
  });
});

function withQuestionCount(questionCount: number): Partial<TrainingSession> {
  const questions = Array.from({ length: questionCount }, (_, index) => ({
    id: `${questionCount}-${index}`,
  })) as TrainingSession["questions"];
  return {
    questionCount,
    questions,
    records: questions.map((question) => ({
      question,
      userAnswer: "1",
      isCorrect: true,
      accuracyLevel: "exact",
      timeUsedMs: 1_000,
      restartCount: 0,
      usedScratchpad: false,
    })),
    accumulatedMs: questionCount * 1_000,
  };
}
