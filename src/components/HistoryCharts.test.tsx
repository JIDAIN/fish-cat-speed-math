import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HistoryCharts } from "./HistoryCharts";
import { TrainingSession } from "@/lib/types";

// Recharts relies on browser layout measurements that JSDOM does not provide.
// This test keeps the HistoryCharts contract observable: every chart receives
// the correctly filtered and aggregated point collection.
vi.mock("./TrendChart", () => ({
  TrendChart: ({ points }: { points: Array<{ sessionCount: number }> }) => (
    <output
      className="trend-chart-test-double"
      data-points={points.length}
      data-covered={points.reduce((sum, point) => sum + point.sessionCount, 0)}
    />
  ),
}));

function makeSession(
  id: string,
  overrides: Partial<TrainingSession> = {},
): TrainingSession {
  const questions = Array.from({ length: 10 }, (_, index) => ({
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
    accumulatedMs: 10_000,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: Number(id.replace(/\D/g, "")) || 1,
    ...overrides,
  };
}

function fishStandardChart(container: HTMLElement) {
  const track = container.querySelector(".trackCharts");
  if (!track)
    throw new Error("standard two-digit-add/subtract track is missing");
  const chart = track.querySelectorAll<HTMLDivElement>(".userChart")[0];
  const output = chart?.querySelector<HTMLOutputElement>(
    ".trend-chart-test-double",
  );
  if (!output) throw new Error("fish trend chart is missing");
  return output;
}

describe("HistoryCharts", () => {
  it.each([
    [1, 1],
    [10, 10],
    [100, 20],
    [1_000, 30],
  ])(
    "renders a readable all-history trend for %i records",
    (recordCount, expectedPoints) => {
      const sessions = Array.from({ length: recordCount }, (_, index) =>
        makeSession(`s${index + 1}`, { startedAt: index + 1 }),
      );
      const { container } = render(<HistoryCharts sessions={sessions} />);
      const chart = fishStandardChart(container);

      expect(chart.dataset.points).toBe(String(expectedPoints));
      expect(chart.dataset.covered).toBe(String(recordCount));
    },
  );

  it("keeps user, question type and answer rules in separate chart tracks", () => {
    const sessions = [
      makeSession("included"),
      makeSession("cat", { userId: "cat" }),
      makeSession("other-type", { questionType: "three_digit_add_subtract" }),
      makeSession("first", {
        questionType: "three_by_two_division",
        subtype: "quotient_first",
      }),
      makeSession("two", {
        questionType: "three_by_two_division",
        subtype: "quotient_two",
      }),
      makeSession("estimate", {
        questionType: "three_by_two_division",
        subtype: "quotient_estimate_3_percent",
      }),
      makeSession("fraction-to", {
        questionType: "fraction_percent_conversion",
        subtype: "fraction_to_percent",
      }),
      makeSession("percent-to", {
        questionType: "fraction_percent_conversion",
        subtype: "percent_to_fraction",
      }),
      makeSession("active", { status: "active" }),
      makeSession("abandoned", { status: "abandoned" }),
    ];
    const { container } = render(<HistoryCharts sessions={sessions} />);

    // Standard type fish chart contains its single completed matching session.
    expect(fishStandardChart(container).dataset.covered).toBe("1");
    // Every rendered chart is isolated; no active/abandoned record contributes.
    const totalCovered = [
      ...container.querySelectorAll<HTMLOutputElement>(
        ".trend-chart-test-double",
      ),
    ].reduce((sum, chart) => sum + Number(chart.dataset.covered), 0);
    expect(totalCovered).toBe(8);
  });

  it("lets a track switch between existing question counts without mixing them", () => {
    const ten = makeSession("ten");
    const twentyQuestions = Array.from({ length: 20 }, (_, index) => ({
      id: `twenty-${index}`,
    })) as TrainingSession["questions"];
    const twenty = makeSession("twenty", {
      questionCount: 20,
      questions: twentyQuestions,
      records: twentyQuestions.map((question) => ({
        question,
        userAnswer: "1",
        isCorrect: true,
        accuracyLevel: "exact",
        timeUsedMs: 1_000,
        restartCount: 0,
        usedScratchpad: false,
      })),
      accumulatedMs: 20_000,
    });
    const { container } = render(<HistoryCharts sessions={[ten, twenty]} />);
    const picker = container.querySelector<HTMLSelectElement>(
      ".trackCharts select",
    );
    if (!picker) throw new Error("question-count picker is missing");

    expect(picker.value).toBe("20");
    expect(fishStandardChart(container).dataset.covered).toBe("1");
    fireEvent.change(picker, { target: { value: "10" } });
    expect(picker.value).toBe("10");
    expect(fishStandardChart(container).dataset.covered).toBe("1");
  });
});
