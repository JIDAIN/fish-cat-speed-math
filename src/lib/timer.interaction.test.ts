import { describe, expect, it, vi } from "vitest";
import { restartCurrentQuestion } from "./session";
import { pauseSessionTimer, resumeSessionTimer } from "./timer";
import { submitCurrentAnswer } from "./training";
import { GeneratedQuestion, TrainingSession } from "./types";

const firstQuestion: GeneratedQuestion = {
  id: "timer-q-1",
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

const secondQuestion: GeneratedQuestion = {
  ...firstQuestion,
  id: "timer-q-2",
  prompt: "5+5",
  answer: "10",
};

function activeSession(
  overrides: Partial<TrainingSession> = {},
): TrainingSession {
  return {
    id: "timer-interaction-session",
    userId: "fish",
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: 10,
    questions: [firstQuestion, secondQuestion],
    currentIndex: 0,
    records: [],
    currentAnswer: "8",
    currentRestartCount: 0,
    accumulatedMs: 0,
    runningSince: 1_000,
    pauseDurationMs: 0,
    status: "active",
    startedAt: 1_000,
    ...overrides,
  };
}

describe("training timer interactions", () => {
  it("pauses a saved session and excludes all background time after recovery", () => {
    vi.useFakeTimers();
    vi.setSystemTime(5_000);
    const paused = pauseSessionTimer(activeSession());

    expect(paused).toMatchObject({ accumulatedMs: 4_000, runningSince: null });

    // The app may remain in the background for any amount of time. Recovery
    // starts a new segment instead of adding that period to effective time.
    vi.setSystemTime(65_000);
    const resumed = resumeSessionTimer(paused);
    vi.setSystemTime(68_000);
    const completed = submitCurrentAnswer(resumed, 7_000, false);

    expect(completed.records[0].timeUsedMs).toBe(7_000);
    vi.useRealTimers();
  });

  it("keeps elapsed time correct over multiple background and recovery cycles", () => {
    let session = activeSession();
    session = pauseSessionTimer(session, 3_000); // 2 seconds active
    session = resumeSessionTimer(session, 50_000);
    session = pauseSessionTimer(session, 54_000); // plus 4 seconds active
    session = resumeSessionTimer(session, 120_000);

    const completed = submitCurrentAnswer(session, 9_000, false);
    expect(completed.records[0].timeUsedMs).toBe(9_000);
    // The last submitted elapsed value contains 6 seconds of effective work;
    // two large background gaps are deliberately excluded.
    expect(completed.accumulatedMs).toBe(6_000);
  });

  it("restarting discards only the current question time and retains completed records", () => {
    const withFinishedFirstQuestion = activeSession({
      currentIndex: 1,
      currentAnswer: "10",
      accumulatedMs: 3_000,
      records: [
        {
          question: firstQuestion,
          userAnswer: "8",
          isCorrect: true,
          accuracyLevel: "exact",
          timeUsedMs: 3_000,
          restartCount: 0,
          usedScratchpad: false,
        },
      ],
    });

    const restarted = restartCurrentQuestion(withFinishedFirstQuestion, 20_000);
    const completed = submitCurrentAnswer(
      { ...restarted, currentAnswer: "10" },
      5_000,
      false,
    );

    expect(completed.records.map((record) => record.timeUsedMs)).toEqual([
      3_000, 2_000,
    ]);
    expect(completed.records[1].restartCount).toBe(1);
  });

  it("cannot create duplicate records or skip a question when submit is tapped rapidly", () => {
    const firstSubmit = submitCurrentAnswer(activeSession(), 2_000, false);
    const secondTap = submitCurrentAnswer(firstSubmit, 2_000, false);

    expect(firstSubmit.currentIndex).toBe(1);
    expect(secondTap).toBe(firstSubmit);
    expect(secondTap.records).toHaveLength(1);
    expect(secondTap.records[0].question.id).toBe(firstQuestion.id);
  });
});
