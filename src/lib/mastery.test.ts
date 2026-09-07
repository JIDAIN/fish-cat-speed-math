import { describe, expect, it } from "vitest";
import { masteryMatrix, recommendTraining } from "./mastery";
import { GeneratedQuestion, QuestionRecord, TrainingSession } from "./types";

function skillQuestion(index: number): GeneratedQuestion {
  return {
    id: `q-${index}`,
    type: "skill_drill",
    subtype: "skill:A-MUL-01:L2",
    prompt: "7×8=",
    answer: "56",
    data: {},
    difficulty: { level: 3, tags: [] },
    primaryStructure: "multiplication_fact",
    secondaryTags: [],
    generationRuleVersion: "test",
    skillId: "A-MUL-01",
    difficultyBand: "L2",
    masteryProfile: "R",
    inputKind: "number",
    structureTags: ["multiplication_fact"],
  };
}

function sessionWithAttempts(
  count: number,
  options: { wrongLast?: boolean; durationMs?: number } = {},
): TrainingSession {
  const questions = Array.from({ length: count }, (_, index) => skillQuestion(index));
  const records: QuestionRecord[] = questions.map((question, index) => ({
    question,
    userAnswer: options.wrongLast && index === count - 1 ? "54" : "56",
    isCorrect: !(options.wrongLast && index === count - 1),
    accuracyLevel:
      options.wrongLast && index === count - 1 ? "wrong" : "exact",
    timeUsedMs: options.durationMs ?? 1_000,
    restartCount: 0,
    usedScratchpad: false,
    timingInterrupted: false,
  }));
  return {
    id: `s-${count}`,
    userId: "fish",
    questionType: "skill_drill",
    subtype: "skill:A-MUL-01:L2",
    questionCount: count,
    questions,
    currentIndex: count,
    records,
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: records.reduce((sum, record) => sum + record.timeUsedMs, 0),
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: 1_000,
    schemaVersion: 2,
    trainingMode: "skill",
    primarySkillId: "A-MUL-01",
    difficultyBand: "L2",
  };
}

describe("mastery engine", () => {
  it("does not declare mastery before the full profile window", () => {
    const summary = masteryMatrix([sessionWithAttempts(29)], "fish")[0];
    expect(summary).toMatchObject({
      skillId: "A-MUL-01",
      difficultyBand: "L2",
      sampleCount: 29,
      requiredSampleCount: 30,
      status: "insufficient",
    });
  });

  it("separates accuracy-first, speed-limited and mastered states", () => {
    const mastered = masteryMatrix([sessionWithAttempts(30)], "fish")[0];
    const accuracy = masteryMatrix(
      [sessionWithAttempts(30, { wrongLast: true })],
      "fish",
    )[0];
    const slow = masteryMatrix(
      [sessionWithAttempts(30, { durationMs: 3_000 })],
      "fish",
    )[0];

    expect(mastered.status).toBe("mastered");
    expect(accuracy.status).toBe("accuracy_first");
    expect(slow.status).toBe("speed_limited");
  });

  it("returns at most two non-mastered recommendations and does not fake a weakness from empty data", () => {
    expect(recommendTraining([], "fish")).toEqual([]);
    const recommendations = recommendTraining(
      [sessionWithAttempts(30, { wrongLast: true })],
      "fish",
      2,
    );
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      skillId: "A-MUL-01",
      status: "accuracy_first",
    });
  });
});
