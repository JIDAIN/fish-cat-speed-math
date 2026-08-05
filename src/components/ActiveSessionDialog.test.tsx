import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActiveSessionDialog } from "./ActiveSessionDialog";
import { TrainingSession } from "@/lib/types";

const session: TrainingSession = {
  id: "active",
  userId: "fish",
  questionType: "two_digit_add_subtract",
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
  status: "active",
  startedAt: 0,
};

describe("ActiveSessionDialog", () => {
  afterEach(cleanup);

  it("uses an explicit PK replacement label when a challenge is pending", () => {
    render(
      <ActiveSessionDialog
        discardLabel="放弃原训练并开始PK挑战"
        onCancel={vi.fn()}
        onContinue={vi.fn()}
        onDiscard={vi.fn()}
        session={session}
        showCancel
      />,
    );

    expect(
      screen.getByRole("button", { name: "放弃原训练并开始PK挑战" }),
    ).toBeTruthy();
  });

  it("offers continue, discard and cancel before replacing a saved exercise", () => {
    const onContinue = vi.fn();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();
    render(
      <ActiveSessionDialog
        onCancel={onCancel}
        onContinue={onContinue}
        onDiscard={onDiscard}
        session={session}
        showCancel
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));
    fireEvent.click(
      screen.getByRole("button", { name: "放弃原训练并开始新的" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
