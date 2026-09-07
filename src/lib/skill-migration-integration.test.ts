import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CloudCompletedTrainingRow } from "./cloud";
import { createDataExport } from "./data-export";
import { GenerationContext } from "./generate";
import { createTrainingSession } from "./session";
import { readActive, saveSession } from "./storage";

const DB = "speed-math-v1";

function removeDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function deterministicContext(): GenerationContext {
  let id = 0;
  return {
    random: () => 0.42,
    createId: () => `integration-question-${id++}`,
  };
}

beforeEach(removeDatabase);
afterEach(removeDatabase);

describe("skill migration integration", () => {
  it("preserves migrated skill metadata through IndexedDB recovery and export", async () => {
    const session = createTrainingSession({
      userId: "fish",
      questionType: "two_by_one_multiply",
      subtype: "standard",
      questionCount: 10,
      now: 1_000,
      createSessionId: () => "integration-session",
      generationContext: deterministicContext(),
    });

    expect(session).toMatchObject({
      schemaVersion: 2,
      trainingMode: "skill",
      primarySkillId: "A-MUL-03",
      difficultyBand: "L2",
    });
    expect(session.questions[0]).toMatchObject({
      skillId: "A-MUL-03",
      difficultyBand: "L2",
      targetPrecision: "exact",
      masteryProfile: "C",
      inputKind: "number",
    });

    await saveSession(session);
    const recovered = await readActive();
    expect(recovered).toMatchObject({
      id: "integration-session",
      schemaVersion: 2,
      trainingMode: "skill",
      primarySkillId: "A-MUL-03",
      difficultyBand: "L2",
    });
    expect(recovered?.questions[0]).toMatchObject({
      skillId: "A-MUL-03",
      difficultyBand: "L2",
      targetPrecision: "exact",
      masteryProfile: "C",
    });

    const completed = {
      ...session,
      status: "completed" as const,
      runningSince: null,
      completedAt: 2_000,
    };
    const cloudRow: CloudCompletedTrainingRow = {
      session_id: completed.id,
      owner_id: "owner-1",
      owner_role: "fish",
      question_type: completed.questionType,
      subtype: completed.subtype,
      question_count: completed.questionCount,
      generator_version: completed.questions[0].generationRuleVersion,
      grading_version: "1.0.0",
      rating_version: "legacy_dynamic",
      schema_version: 2,
      session_data: completed as unknown as Record<string, unknown>,
      completed_at: "2026-09-07T00:00:00Z",
      real_completed_at: "2026-09-07T00:00:01Z",
      created_at: "2026-09-07T00:00:02Z",
    };
    const exported = createDataExport([cloudRow], 3_000);

    expect(exported.trainings[0]).toMatchObject({
      schema_version: 2,
      training_mode: "skill",
      primary_skill_id: "A-MUL-03",
      difficulty_band: "L2",
    });
    expect(exported.questions[0]).toMatchObject({
      skill_id: "A-MUL-03",
      difficulty_band: "L2",
      target_precision: "exact",
      mastery_profile: "C",
      input_kind: "number",
    });
  });
});
