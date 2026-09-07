import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateQuestion } from "./generate";
import { createTrainingSession } from "./session";
import { readActive, saveSession } from "./storage";
import { TrainingSession } from "./types";

const DB = "speed-math-v1";

function removeDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function baseSession(overrides: Partial<TrainingSession>): TrainingSession {
  return {
    id: "v2-session",
    userId: "fish",
    questionType: "two_by_two_multiply",
    subtype: "carry_intensive",
    questionCount: 20,
    questions: [],
    currentIndex: 0,
    records: [],
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 0,
    runningSince: null,
    pauseDurationMs: 0,
    status: "active",
    startedAt: 1,
    schemaVersion: 2,
    trainingMode: "skill",
    primarySkillId: "A-MUL-05",
    difficultyBand: "L2",
    ...overrides,
  };
}

beforeEach(removeDatabase);
afterEach(removeDatabase);

describe("schema-v2 storage normalization", () => {
  it("restores carry-intensive and hundred-scaling legacy subtypes", async () => {
    await saveSession(baseSession({ id: "carry" }));
    expect(await readActive()).toMatchObject({
      id: "carry",
      subtype: "carry_intensive",
    });

    await removeDatabase();
    await saveSession(
      baseSession({
        id: "scale",
        questionType: "special_hundred_scaling_division",
        subtype: "hundred_scaling",
      }),
    );
    expect(await readActive()).toMatchObject({
      id: "scale",
      subtype: "hundred_scaling",
    });
  });

  it("restores encoded foundation skill subtypes and generated metadata", async () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:A-PCT-06:L3",
      questionCount: 10,
      now: 100,
      createSessionId: () => "foundation-storage",
    });
    await saveSession(session);

    const restored = await readActive();
    expect(restored).toMatchObject({
      id: "foundation-storage",
      questionType: "skill_drill",
      subtype: "skill:A-PCT-06:L3",
      primarySkillId: "A-PCT-06",
      difficultyBand: "L3",
      trainingMode: "skill",
    });
    expect(restored?.questions[0]).toMatchObject({
      type: "skill_drill",
      subtype: "skill_drill",
      skillId: "A-PCT-06",
      difficultyBand: "L3",
    });
  });

  it("preserves registered skill metadata and step specifications", async () => {
    const question = {
      ...generateQuestion("two_by_one_multiply", "standard"),
      skillId: "A-MUL-03" as const,
      secondarySkillIds: ["A-MUL-01" as const],
      difficultyBand: "L2" as const,
      structureTags: ["single_carry"],
      targetPrecision: "exact" as const,
      masteryProfile: "C" as const,
      inputKind: "number" as const,
      generatorParams: { min: 10, max: 99 },
      stepSpecs: [
        {
          id: "answer",
          stepSkillId: "A-MUL-03" as const,
          stepType: "numeric_answer",
          prompt: "计算结果",
          inputKind: "number" as const,
          targetPrecision: "exact" as const,
        },
      ],
    };
    await saveSession(baseSession({ questions: [question] }));

    const restored = await readActive();
    expect(restored).toMatchObject({
      schemaVersion: 2,
      trainingMode: "skill",
      primarySkillId: "A-MUL-05",
      difficultyBand: "L2",
    });
    expect(restored?.questions[0]).toMatchObject({
      skillId: "A-MUL-03",
      secondarySkillIds: ["A-MUL-01"],
      difficultyBand: "L2",
      targetPrecision: "exact",
      masteryProfile: "C",
      inputKind: "number",
    });
    expect(restored?.questions[0].stepSpecs?.[0]).toMatchObject({
      stepSkillId: "A-MUL-03",
      stepType: "numeric_answer",
    });
  });
});
