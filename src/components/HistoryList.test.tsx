import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryList } from "./HistoryList";
import { TrainingSession } from "@/lib/types";

function session(
  id: string,
  userId: "fish" | "cat",
  overrides: Partial<TrainingSession> = {},
): TrainingSession {
  const questions = Array.from({ length: 10 }, (_, index) => ({
    id: `${id}-${index}`,
  })) as TrainingSession["questions"];
  return {
    id,
    userId,
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: 10,
    questions,
    currentIndex: 10,
    records: questions.map((question, index) => ({
      question,
      userAnswer: "1",
      isCorrect: index < 9,
      accuracyLevel: "exact" as const,
      timeUsedMs: 2_000,
      restartCount: 0,
      usedScratchpad: false,
    })),
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 20_000,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: new Date(2026, 0, 3, 9).getTime(),
    ...overrides,
  };
}

describe("HistoryList", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });
  it("defaults to the current user and exposes weighted summary values", () => {
    const own = session("own", "fish", { ownerAccountId: "account-fish" });
    const partner = session("partner", "cat", {
      ownerAccountId: "account-cat",
    });
    render(
      <HistoryList
        canViewPartner
        currentAccountId="account-fish"
        currentUserId="fish"
        onOpen={vi.fn()}
        sessions={[own, partner]}
      />,
    );

    expect(screen.getByText("训练组数").parentElement?.textContent).toContain(
      "1",
    );
    expect(screen.getByText("总正确率").parentElement?.textContent).toContain(
      "90%",
    );
    expect(screen.getAllByText("两位数加减").length).toBeGreaterThan(0);
    expect(screen.queryByText("共享只读")).toBeNull();
  });

  it("switches to the paired user as read-only and never exposes a retry action", () => {
    const own = session("own", "fish", {
      ownerAccountId: "account-fish",
      syncStatus: "failed",
    });
    const partner = session("partner", "cat", {
      ownerAccountId: "account-cat",
      syncStatus: "failed",
    });
    const onSync = vi.fn();
    render(
      <HistoryList
        canViewPartner
        currentAccountId="account-fish"
        currentUserId="fish"
        onOpen={vi.fn()}
        onSync={onSync}
        sessions={[own, partner]}
      />,
    );
    expect(screen.getByRole("button", { name: "重试同步" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /小猫/ })[0]);
    expect(screen.getByText("共享只读")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "重试同步" })).toBeNull();
  });

  it("only offers type and subtype filters that exist for the selected user", () => {
    const add = session("add", "fish");
    const division = session("division", "fish", {
      questionType: "three_by_two_division",
      subtype: "quotient_first",
    });
    render(
      <HistoryList
        currentUserId="fish"
        onOpen={vi.fn()}
        sessions={[add, division]}
      />,
    );
    const typeFilter = screen.getByLabelText("筛选题型");
    expect(typeFilter.textContent).toContain("两位数加减");
    expect(typeFilter.textContent).toContain("三位数÷两位数");
    fireEvent.change(typeFilter, {
      target: { value: "three_by_two_division" },
    });
    expect(screen.queryByLabelText("筛选子模式")).toBeNull();
    expect(document.querySelectorAll(".historySession")).toHaveLength(1);
    expect(document.querySelector(".historySession")?.textContent).toContain(
      "求商首位",
    );
  });

  it("keeps unlogged local records local and opens a selected card", () => {
    const onOpen = vi.fn();
    const local = session("local", "fish");
    render(
      <HistoryList currentUserId="fish" onOpen={onOpen} sessions={[local]} />,
    );
    expect(screen.getByText("仅本地")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /两位数加减/ }));
    expect(onOpen).toHaveBeenCalledWith(local);
  });

  it("restores the current account's last history filters without sharing them", () => {
    window.sessionStorage.setItem(
      "speed-math-history-view:account-fish:fish",
      JSON.stringify({ selectedSource: "pk", selectedRange: "7d" }),
    );
    render(
      <HistoryList
        currentAccountId="account-fish"
        currentUserId="fish"
        onOpen={vi.fn()}
        sessions={[session("own", "fish", { trainingSource: "pk" })]}
      />,
    );

    const values = Array.from(document.querySelectorAll("select")).map(
      (select) => select.value,
    );
    expect(values).toContain("pk");
    expect(values).toContain("7d");
  });
});
