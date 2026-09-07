import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTrainingSession } from "./session";
import { readActive, saveSession } from "./storage";
import { submitCurrentStep } from "./training";

const DB = "speed-math-v1";

function removeDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

beforeEach(removeDatabase);
afterEach(removeDatabase);

describe("batch 5 flow storage", () => {
  it("restores current step progress, choices, timer and finished step records", async () => {
    let session = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "skill:C-DIVSPLIT-11:L2",
      questionCount: 10,
      now: 1_000,
      createSessionId: () => "flow-storage",
    });
    const firstStep = session.questions[0].stepSpecs?.[0];
    expect(firstStep?.choices?.length).toBeGreaterThan(0);
    session = {
      ...session,
      currentStepAnswer: String(firstStep?.expectedValue),
      currentStepEditCount: 1,
    };
    session = submitCurrentStep(session, 400, false, 1_400);
    await saveSession(session);

    const restored = await readActive();
    expect(restored).toMatchObject({
      id: "flow-storage",
      trainingMode: "flow",
      currentStepIndex: 1,
      currentStepAnswer: "",
      currentStepEditCount: 0,
    });
    expect(restored?.currentStepRecords).toHaveLength(1);
    expect(restored?.currentStepRecords?.[0]).toMatchObject({
      stepSkillId: "C-DIVSPLIT-01",
      durationMs: 400,
      isCorrect: true,
    });
    expect(restored?.currentStepTimer).toBeTruthy();
    expect(restored?.questions[0].stepSpecs?.[0].choices?.length).toBeGreaterThan(0);
  });
});
