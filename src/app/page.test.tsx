import "fake-indexeddb/auto";
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Home from "./page";
import { readActive, saveSession } from "@/lib/storage";
import { GeneratedQuestion, TrainingSession } from "@/lib/types";

const DB_NAME = "speed-math-v1";

const question: GeneratedQuestion = {
  id: "resume-question",
  type: "two_digit_add_subtract",
  subtype: "standard",
  prompt: "4+4",
  answer: "8",
  data: {},
  difficulty: { level: 3, tags: [] },
  primaryStructure: "test_structure",
  secondaryTags: [],
  generationRuleVersion: "test",
};

function activeSession(
  overrides: Partial<TrainingSession> = {},
): TrainingSession {
  return {
    id: "saved-active",
    userId: "fish",
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: 10,
    questions: [
      question,
      { ...question, id: "second", prompt: "5+5", answer: "10" },
    ],
    currentIndex: 1,
    records: [
      {
        question,
        userAnswer: "8",
        isCorrect: true,
        accuracyLevel: "exact",
        timeUsedMs: 1_000,
        restartCount: 0,
        usedScratchpad: false,
      },
    ],
    currentAnswer: "保留答案",
    currentRestartCount: 2,
    accumulatedMs: 1_000,
    runningSince: null,
    pauseDurationMs: 0,
    status: "active",
    startedAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

async function deleteDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

describe("Home active-session interactions", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    cleanup();
    await deleteDatabase();
  });

  it("starts a new active session and enters the training view when none exists", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    expect(await screen.findByText("重开本题")).toBeTruthy();
    await waitFor(async () => {
      const active = await readActive();
      expect(active?.status).toBe("active");
    });
  });

  it("commits a custom seventy-question choice into the active session", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /当前题量/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /自定义模式/ }));
    fireEvent.change(
      within(dialog).getByRole("slider", { name: "自定义题量" }),
      {
        target: { value: "70" },
      },
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /确定（70题）/ }),
    );

    expect(
      screen.getByRole("button", { name: /当前题量/ }).textContent,
    ).toContain("70题");
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    await waitFor(async () => {
      const active = await readActive();
      expect(active).toMatchObject({ questionCount: 70, currentIndex: 0 });
      expect(active?.questions).toHaveLength(70);
    });
  });

  it("does not change the home count when the selector is cancelled", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /当前题量/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /自定义模式/ }));
    fireEvent.change(
      within(dialog).getByRole("slider", { name: "自定义题量" }),
      {
        target: { value: "100" },
      },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));

    expect(
      screen.getByRole("button", { name: /当前题量/ }).textContent,
    ).toContain("20题");
  });

  it("creates a one-hundred-question training set when that custom count is confirmed", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /当前题量/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /自定义模式/ }));
    fireEvent.change(
      within(dialog).getByRole("slider", { name: "自定义题量" }),
      {
        target: { value: "100" },
      },
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: /确定（100题）/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    await waitFor(async () => {
      const active = await readActive();
      expect(active?.questionCount).toBe(100);
      expect(active?.questions).toHaveLength(100);
    });
  });

  it("ignores a rapid second start tap while the IndexedDB preflight is pending", async () => {
    render(<Home />);
    const startButton = screen.getByRole("button", { name: "开始练习" });

    fireEvent.click(startButton);
    fireEvent.click(startButton);

    expect(await screen.findByText("重开本题")).toBeTruthy();
    await waitFor(async () => {
      // The real storage implementation removes stale active records. The
      // page-level in-flight guard prevents a second local creation request.
      const active = await readActive();
      expect(active?.status).toBe("active");
      expect(active?.questions).toHaveLength(20);
    });
  });

  it("continues the saved session with its question, answer, and restart count", async () => {
    const saved = activeSession();
    await saveSession(saved);
    render(<Home />);

    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));

    expect(await screen.findByText("5+5")).toBeTruthy();
    expect(screen.getByText("保留答案")).toBeTruthy();
    expect(screen.getByRole("button", { name: /重开本题（2）/ })).toBeTruthy();
  });

  it("abandons the old active session before creating a different new one", async () => {
    const saved = activeSession();
    await saveSession(saved);
    render(<Home />);

    await screen.findByRole("dialog");
    fireEvent.click(
      screen.getByRole("button", { name: "放弃原训练并开始新的" }),
    );
    expect(await screen.findByText("重开本题")).toBeTruthy();

    await waitFor(async () => {
      const active = await readActive();
      expect(active?.id).not.toBe(saved.id);
      expect(active?.status).toBe("active");
    });
  });

  it("cancels the recovery dialog without modifying the saved session", async () => {
    const saved = activeSession();
    await saveSession(saved);
    render(<Home />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("重开本题")).toBeNull();
    await expect(readActive()).resolves.toMatchObject({
      id: saved.id,
      currentAnswer: "保留答案",
      currentRestartCount: 2,
    });
  });

  it("clears answer and scratch state on restart, persists restart count, and records it on submit", async () => {
    const saved = activeSession({
      questions: [question],
      currentIndex: 0,
      records: [],
      currentAnswer: "8",
      currentRestartCount: 0,
    });
    await saveSession(saved);
    render(<Home />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));
    await screen.findByText("4+4");

    fireEvent.click(screen.getByRole("button", { name: /草稿/ }));
    expect(await screen.findByText("完成草稿")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "重开本题" }));
    expect(screen.queryByText("完成草稿")).toBeNull();
    expect(document.querySelector(".answer")?.textContent).toBe("—");

    await waitFor(async () => {
      await expect(readActive()).resolves.toMatchObject({
        currentRestartCount: 1,
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "重开本题（1）" }));
    fireEvent.click(screen.getByRole("button", { name: "8" }));
    fireEvent.click(screen.getByRole("button", { name: "确定" }));

    expect(await screen.findByText("训练完成！")).toBeTruthy();
    expect(screen.getByText("2次")).toBeTruthy();
    expect(document.querySelectorAll(".questionRow")).toHaveLength(1);
  });
});
