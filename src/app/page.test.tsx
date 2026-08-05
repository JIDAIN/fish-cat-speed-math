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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";
import { readActive, readCompleted, saveSession } from "@/lib/storage";
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

const fractionComparisonQuestion: GeneratedQuestion = {
  ...question,
  id: "fraction-comparison-question",
  type: "fraction_comparison",
  subtype: "comparison",
  prompt: "53/104 ？ 88/175",
  answer: ">",
  data: { a: 53, b: 104, c: 88, d: 175 },
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
    window.history.replaceState({}, "", "/");
    await deleteDatabase();
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
    await deleteDatabase();
  });

  it("starts a new active session and enters the training view when none exists", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    expect(await screen.findByText("重开训练")).toBeTruthy();
    await waitFor(async () => {
      const active = await readActive();
      expect(active?.status).toBe("active");
    });
  });

  it("immediately pauses and saves an active session when the page is hidden", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));
    await screen.findByText("重开训练");
    await waitFor(async () => {
      expect((await readActive())?.runningSince).toEqual(expect.any(Number));
    });

    const previous = Object.getOwnPropertyDescriptor(document, "hidden");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));

    await waitFor(async () => {
      expect(await readActive()).toMatchObject({ runningSince: null });
    });
    if (previous) Object.defineProperty(document, "hidden", previous);
    else delete (document as { hidden?: boolean }).hidden;
  });

  it("pauses once for back navigation and remains safe across repeated leave events", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));
    await screen.findByText("重开训练");

    fireEvent(window, new PopStateEvent("popstate"));
    fireEvent(window, new Event("pagehide"));
    fireEvent(window, new Event("beforeunload"));

    await waitFor(async () => {
      expect(await readActive()).toMatchObject({ runningSince: null });
    });
  });

  it("starts a fresh segment after a BFCache pageshow without counting its gap", async () => {
    await saveSession(
      activeSession({ runningSince: 1_000, accumulatedMs: 800 }),
    );
    render(<Home />);
    expect(await screen.findByText("检测到一组暂存训练")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));

    fireEvent(window, new Event("pagehide"));
    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));

    await waitFor(async () => {
      expect((await readActive())?.runningSince).toEqual(expect.any(Number));
    });
  });

  it("freezes the selected three-percent division rule in a new session", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "三位数÷两位数" }));
    fireEvent.click(screen.getByRole("button", { name: "3%估算" }));
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    expect(
      await screen.findByText("输入近似商，相对误差不超过 3%"),
    ).toBeTruthy();
    await waitFor(async () => {
      expect(await readActive()).toMatchObject({
        questionType: "three_by_two_division",
        subtype: "quotient_estimate_3_percent",
      });
    });
  });

  it("freezes percent-to-fraction from its independent primary entry", async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "百分数转分数" }));
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    await waitFor(async () => {
      expect(await readActive()).toMatchObject({
        questionType: "fraction_percent_conversion",
        subtype: "percent_to_fraction",
      });
    });
  });

  it("auto-advances percent-to-fraction entry once and keeps manual numerator edits focused", async () => {
    const { container } = render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: "百分数转分数" }));
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    const active = await waitFor(async () => {
      const stored = await readActive();
      expect(stored?.subtype).toBe("percent_to_fraction");
      return stored;
    });
    const question = active?.questions[0];
    const numerator = String(question?.data.numerator);
    const denominator = String(question?.data.denominator);

    expect(screen.getByLabelText(question?.prompt ?? "")).toBeTruthy();
    expect(screen.queryByText("先输入分子，再点击分母继续输入")).toBeNull();
    expect(container.querySelectorAll(".fractionAnswerLine")).toHaveLength(1);

    const numeratorInput = screen.getByRole("button", { name: "输入分子" });
    const denominatorInput = screen.getByRole("button", { name: "输入分母" });
    expect(numeratorInput.classList.contains("active")).toBe(true);
    expect(numeratorInput.getAttribute("aria-pressed")).toBe("true");
    expect(denominatorInput.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: numerator[0] }));
    expect(denominatorInput.classList.contains("active")).toBe(true);
    expect(numeratorInput.getAttribute("aria-pressed")).toBe("false");
    expect(denominatorInput.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(numeratorInput);
    fireEvent.click(screen.getByRole("button", { name: "清空答案" }));
    numerator
      .split("")
      .forEach((digit) =>
        fireEvent.click(screen.getByRole("button", { name: digit })),
      );
    expect(numeratorInput.classList.contains("active")).toBe(true);
    expect(numeratorInput.getAttribute("aria-pressed")).toBe("true");
    expect(denominatorInput.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "输入分母" }));
    fireEvent.click(screen.getByRole("button", { name: "清空答案" }));
    denominator
      .split("")
      .forEach((digit) =>
        fireEvent.click(screen.getByRole("button", { name: digit })),
      );

    expect(screen.getByRole("button", { name: "输入分子" }).textContent).toBe(
      numerator,
    );
    expect(screen.getByRole("button", { name: "输入分母" }).textContent).toBe(
      denominator,
    );
    fireEvent.click(screen.getByRole("button", { name: "确定" }));

    await waitFor(async () => {
      const stored = await readActive();
      expect(stored?.records[0]).toMatchObject({
        userAnswer: `${numerator}/${denominator}`,
        isCorrect: true,
      });
    });
  });

  it("renders the preset two-decimal percentage without rounding it to one decimal", async () => {
    const percentQuestion: GeneratedQuestion = {
      ...question,
      id: "one-sixteenth-percent",
      type: "fraction_percent_conversion",
      subtype: "percent_to_fraction",
      prompt: "6.25% ≈ __ / __",
      answer: "1/16",
      data: {
        numerator: 1,
        denominator: 16,
        percent: 6.25,
        percentAnswer: "6.25",
      },
      primaryStructure: "unit_fraction",
      generationRuleVersion: "2.5.0",
    };
    await saveSession(
      activeSession({
        questionType: "fraction_percent_conversion",
        subtype: "percent_to_fraction",
        questionCount: 10,
        questions: Array.from({ length: 10 }, (_, index) => ({
          ...percentQuestion,
          id: `${percentQuestion.id}-${index}`,
        })),
        currentIndex: 0,
        records: [],
        currentAnswer: "",
        currentRestartCount: 0,
      }),
    );
    render(<Home />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));

    expect(await screen.findByText("6.25% ≈")).toBeTruthy();
    expect(screen.queryByText("6.3% ≈")).toBeNull();
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

    expect(await screen.findByText("重开训练")).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "重开训练" })).toBeTruthy();
    await expect(readActive()).resolves.toMatchObject({
      id: saved.id,
      currentIndex: 1,
      currentAnswer: "保留答案",
      currentRestartCount: 2,
    });
  });

  it.each([
    [360, 640],
    [375, 667],
    [390, 844],
    [412, 915],
  ])(
    "uses the single-screen training layout at %ix%i",
    async (width, height) => {
      Object.defineProperties(window, {
        innerWidth: { configurable: true, value: width },
        innerHeight: { configurable: true, value: height },
      });
      await saveSession(
        activeSession({
          currentIndex: 0,
          records: [],
          currentAnswer: "",
          currentRestartCount: 0,
        }),
      );
      render(<Home />);

      await screen.findByRole("dialog");
      fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));
      await screen.findByText("4+4");

      const trainingPage = document.querySelector("main.trainingPage");
      expect(trainingPage).toBeTruthy();
      expect(trainingPage?.querySelector(".trainingHeader")).toBeTruthy();
      expect(trainingPage?.querySelector(".trainingMain")).toBeTruthy();

      const keypad = trainingPage?.querySelector(".trainingKeypad");
      expect(keypad).toBeTruthy();
      expect(keypad?.querySelectorAll("button")).toHaveLength(15);

      // Scrolling is locked by the training-page class, never by a global
      // body mutation that would also break home and history screens.
      expect(document.body.style.overflow).toBe("");
    },
  );

  it("renders fraction comparison as vertical fractions with labeled controls", async () => {
    await saveSession(
      activeSession({
        questionType: "fraction_comparison",
        subtype: "comparison",
        questions: [fractionComparisonQuestion],
        currentIndex: 0,
        records: [],
        currentAnswer: "",
        currentRestartCount: 0,
      }),
    );
    render(<Home />);

    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));

    expect(
      await screen.findByLabelText(fractionComparisonQuestion.prompt),
    ).toBeTruthy();
    expect(screen.getByText("53")).toBeTruthy();
    expect(screen.getByText("104")).toBeTruthy();
    expect(screen.getByText("88")).toBeTruthy();
    expect(screen.getByText("175")).toBeTruthy();
    expect(screen.getByLabelText("当前选择").textContent).toBe("?");
    expect(document.querySelector(".answer")).toBeNull();
    expect(screen.queryByRole("button", { name: "等于" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "大于" }));
    expect(screen.getByLabelText("当前选择").textContent).toBe(">");
    expect(
      (screen.getByRole("button", { name: "确定" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByRole("button", { name: "重开训练" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "确定" }));
    expect(await screen.findByText("训练完成！")).toBeTruthy();
    expect(screen.getByText("1/1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "打开复盘草稿" })).toBeTruthy();
    expect(screen.queryByText("重开")).toBeNull();
  });

  it("keeps a completed PK result when pagehide fires during result navigation", async () => {
    const pkSession = activeSession({
      id: crypto.randomUUID(),
      questions: [question],
      currentIndex: 0,
      records: [],
      currentAnswer: "",
      currentRestartCount: 0,
      trainingSource: "pk",
      pkChallengeId: "challenge-1",
      pkSyncStatus: "not_synced",
    });
    await saveSession(pkSession);
    window.history.replaceState({}, "", "/#/training");
    render(<Home />);
    await screen.findByText("4+4");

    const originalPushState = window.history.pushState.bind(window.history);
    let restoredOldTrainingRoute = false;
    vi.spyOn(window.history, "pushState").mockImplementation(
      (data, unused, url) => {
        originalPushState(data, unused, url);
        if (String(url).includes("#/result/") && !restoredOldTrainingRoute) {
          restoredOldTrainingRoute = true;
          window.history.replaceState({}, "", "/#/training");
          window.dispatchEvent(new Event("pagehide"));
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "8" }));
    fireEvent.click(screen.getByRole("button", { name: "确定" }));

    expect(await screen.findByText("训练完成！")).toBeTruthy();
    await waitFor(async () => {
      expect(await readActive()).toBeUndefined();
      expect(await readCompleted()).toEqual([
        expect.objectContaining({
          id: pkSession.id,
          status: "completed",
          trainingSource: "pk",
          pkChallengeId: "challenge-1",
        }),
      ]);
    });
  });

  it("abandons the old active session before creating a different new one", async () => {
    const saved = activeSession();
    await saveSession(saved);
    render(<Home />);

    await screen.findByRole("dialog");
    fireEvent.click(
      screen.getByRole("button", { name: "放弃原训练并开始新的" }),
    );
    expect(await screen.findByText("重开训练")).toBeTruthy();

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
    expect(screen.queryByText("重开训练")).toBeNull();
    await expect(readActive()).resolves.toMatchObject({
      id: saved.id,
      currentAnswer: "保留答案",
      currentRestartCount: 2,
    });
  });

  it("discards the old run and starts a fresh training set with frozen settings", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const saved = activeSession({
      currentAnswer: "10",
    });
    const oldQuestionIds = saved.questions.map(({ id }) => id);
    await saveSession(saved);
    render(<Home />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "继续原训练" }));
    await screen.findByText("5+5");

    fireEvent.click(screen.getByRole("button", { name: /草稿/ }));
    expect(
      await screen.findByRole("toolbar", { name: "草稿工具" }),
    ).toBeTruthy();
    const restartButton = screen.getByRole("button", { name: "重开训练" });
    fireEvent.click(restartButton);
    fireEvent.click(restartButton);

    await waitFor(async () => {
      const active = await readActive();
      expect(active).toMatchObject({
        userId: saved.userId,
        questionType: saved.questionType,
        subtype: saved.subtype,
        questionCount: saved.questionCount,
        currentIndex: 0,
        records: [],
        currentAnswer: "",
        currentRestartCount: 0,
        accumulatedMs: 0,
        status: "active",
      });
      expect(active?.id).not.toBe(saved.id);
      expect(active?.questions).toHaveLength(saved.questionCount);
      expect(active?.questions.map(({ id }) => id)).not.toEqual(oldQuestionIds);
    });
    expect(screen.queryByRole("toolbar", { name: "草稿工具" })).toBeNull();
    expect(document.querySelector(".answer")?.textContent).toBe("");
    expect(screen.getByText(`1/${saved.questionCount}`)).toBeTruthy();
    expect(screen.getByRole("button", { name: "重开训练" })).toBeTruthy();
  });
});
