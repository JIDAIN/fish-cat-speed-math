import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PKDetails } from "./PKDetails";
import { PKChallenge } from "@/lib/pk";
import {
  GeneratedQuestion,
  QuestionRecord,
  TrainingSession,
} from "@/lib/types";

function question(index: number): GeneratedQuestion {
  return {
    id: `q-${index}`,
    type: "two_digit_add_subtract",
    subtype: "standard",
    prompt: `${index + 10}+1=`,
    answer: String(index + 11),
    data: {},
    difficulty: { level: 1, tags: [] },
    primaryStructure: "test",
    secondaryTags: [],
    generationRuleVersion: "test",
  };
}
function makeSession(
  id: string,
  role: "fish" | "cat",
  count: number,
  missing = new Set<number>(),
  wrong = new Set<number>(),
  reversed = false,
): TrainingSession {
  const questions = Array.from({ length: count }, (_, index) =>
    question(index),
  );
  const records: QuestionRecord[] = questions
    .filter((_, index) => !missing.has(index))
    .map((item, index) => ({
      question: item,
      userAnswer: wrong.has(index) ? "错误" : item.answer,
      isCorrect: !wrong.has(index),
      accuracyLevel: wrong.has(index) ? "wrong" : "exact",
      timeUsedMs: 1000 + index,
      restartCount: 0,
      usedScratchpad: false,
    }));
  return {
    id,
    userId: role,
    ownerAccountId: `${role}-id`,
    questionType: "two_digit_add_subtract",
    subtype: "standard",
    questionCount: count,
    questions,
    currentIndex: records.length,
    records: reversed ? [...records].reverse() : records,
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: count * 1000,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: 1,
  };
}
function makeChallenge(
  count = 10,
  wrong = new Set<number>(),
): { challenge: PKChallenge; response: TrainingSession } {
  const frozenSession = makeSession(
    "fish-run",
    "fish",
    count,
    new Set(),
    wrong,
  );
  const response = makeSession(
    "cat-run",
    "cat",
    count,
    new Set(),
    new Set(),
    true,
  );
  return {
    challenge: {
      id: "challenge",
      challengerId: "fish-id",
      challengerRole: "fish",
      opponentId: "cat-id",
      opponentRole: "cat",
      sourceSessionId: frozenSession.id,
      frozenSession,
      opponentSessionId: response.id,
      createdAt: 1,
      completedAt: 2,
      status: "completed",
    },
    response,
  };
}

describe("PKDetails", () => {
  it.each([10, 20, 40])("always renders all %s frozen questions", (count) => {
    const { challenge, response } = makeChallenge(count);
    const { container } = render(
      <PKDetails challenge={challenge} response={response} />,
    );
    expect(container.querySelectorAll(".pkQuestionRows li")).toHaveLength(
      count,
    );
  });

  it("uses stable question IDs, keeps missing records visible, and only shows answers when useful", () => {
    const { challenge, response } = makeChallenge(10, new Set([1]));
    response.records = response.records.filter(
      (record) => record.question.id !== "q-3",
    );
    const { container } = render(
      <PKDetails challenge={challenge} response={response} />,
    );
    expect(container.querySelectorAll(".pkQuestionRows li")).toHaveLength(10);
    expect(container.querySelectorAll(".pkOneCorrect")).toHaveLength(1);
    expect(container.querySelectorAll(".pkMissing")).toHaveLength(1);
    expect(screen.getByText(/未作答 · —/)).toBeTruthy();
    expect(screen.getAllByText(/正确答案：/)).toHaveLength(2);
  });

  it("highlights both-wrong and different answers without any review filter buttons", () => {
    const { challenge, response } = makeChallenge(10, new Set([2]));
    response.records = response.records.map((record) =>
      record.question.id === "q-2"
        ? {
            ...record,
            userAnswer: "另一错误",
            isCorrect: false,
            accuracyLevel: "wrong",
          }
        : record,
    );
    const { container } = render(
      <PKDetails challenge={challenge} response={response} />,
    );
    expect(container.querySelectorAll(".pkBothWrong")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "全部" })).toBeNull();
    expect(screen.queryByRole("button", { name: "仅看错题" })).toBeNull();
    expect(screen.queryByRole("button", { name: "结果不同" })).toBeNull();
  });
});
