import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HistoryList } from "./HistoryList";
import { TrainingSession } from "@/lib/types";

function session(
  id: string,
  userId: "fish" | "cat",
  startedAt: number,
  questionType: TrainingSession["questionType"] = "two_digit_add_subtract",
): TrainingSession {
  return {
    id,
    userId,
    questionType,
    subtype: "standard",
    questionCount: 10,
    questions: [],
    currentIndex: 0,
    records: [],
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 0,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt,
  };
}

describe("HistoryList", () => {
  it("selects the newest date after asynchronous records arrive and switches dates", () => {
    const onOpen = vi.fn();
    const older = session("older", "fish", new Date(2026, 0, 2, 9).getTime());
    const newer = session("newer", "cat", new Date(2026, 0, 3, 9).getTime());
    const rendered = render(<HistoryList onOpen={onOpen} sessions={[]} />);

    rendered.rerender(
      <HistoryList onOpen={onOpen} sessions={[older, newer]} />,
    );
    const dateButtons =
      rendered.container.querySelectorAll<HTMLButtonElement>(
        ".datePicker button",
      );
    expect(dateButtons).toHaveLength(2);
    expect(
      rendered.container.querySelector(".datePicker .selected")?.textContent,
    ).toBe(dateButtons[0].textContent);

    fireEvent.click(dateButtons[1]);
    expect(
      rendered.container.querySelector(".datePicker .selected")?.textContent,
    ).toBe(dateButtons[1].textContent);
    fireEvent.click(screen.getByRole("button", { name: /两位数加减/ }));
    expect(onOpen).toHaveBeenCalledWith(older);
  });

  it("splits fish and cat, orders a day's sessions newest first, and opens details", () => {
    const onOpen = vi.fn();
    const day = new Date(2026, 0, 3);
    const fishEarlier = session("fish-earlier", "fish", day.setHours(8));
    const fishLater = session("fish-later", "fish", day.setHours(18));
    const cat = session(
      "cat",
      "cat",
      day.setHours(12),
      "three_digit_add_subtract",
    );
    const { container } = render(
      <HistoryList onOpen={onOpen} sessions={[fishEarlier, cat, fishLater]} />,
    );

    const sections = container.querySelectorAll(".historyUserSection");
    expect(sections).toHaveLength(2);
    expect(sections[0].textContent).toContain("小鱼");
    expect(sections[1].textContent).toContain("小猫");

    const fishButtons =
      sections[0].querySelectorAll<HTMLButtonElement>(".historySession");
    expect(fishButtons).toHaveLength(2);
    expect(fishButtons[0].textContent).toContain("18:00");
    fireEvent.click(fishButtons[0]);
    expect(onOpen).toHaveBeenCalledWith(fishLater);
  });

  it("does not show active or abandoned sessions in dates or user sections", () => {
    const onOpen = vi.fn();
    const completed = session(
      "completed",
      "fish",
      new Date(2026, 0, 3).getTime(),
    );
    const active = {
      ...session("active", "fish", new Date(2026, 0, 4).getTime()),
      status: "active" as const,
    };
    const abandoned = {
      ...session("abandoned", "cat", new Date(2026, 0, 5).getTime()),
      status: "abandoned" as const,
    };
    const { container } = render(
      <HistoryList onOpen={onOpen} sessions={[completed, active, abandoned]} />,
    );

    expect(container.querySelectorAll(".datePicker button")).toHaveLength(1);
    expect(container.querySelectorAll(".historySession")).toHaveLength(1);
    expect(container.textContent).not.toContain("active");
    expect(container.textContent).not.toContain("abandoned");
  });
});
