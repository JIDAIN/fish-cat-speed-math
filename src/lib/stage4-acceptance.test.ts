import { describe, expect, it } from "vitest";
import { generatePathComparisonSet, summarizePathComparisons } from "./batch8-training";
import { GenerationContext } from "./generate";
import {
  generateSkillDrillSet,
  implementedSkillIds,
} from "./implemented-skill-drills";
import {
  masteryMatrix,
  recommendTraining,
} from "./mastery";
import { createTrainingSession } from "./session";
import { skillDefinitions } from "./skill-registry";
import {
  DifficultyBand,
  QuestionRecord,
  SkillId,
  TrainingSession,
} from "./types";

function context(seed = 1): GenerationContext {
  let state = seed >>> 0;
  let id = 0;
  return {
    random: () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    },
    createId: () => `accept-${seed}-${id++}`,
  };
}

function completedSkillSession({
  skillId,
  band = "L2",
  userId = "fish",
  correct = true,
  timeUsedMs = 1_000,
  timingInterrupted = false,
  startedAt = 1,
}: {
  skillId: SkillId;
  band?: DifficultyBand;
  userId?: string;
  correct?: boolean;
  timeUsedMs?: number;
  timingInterrupted?: boolean;
  startedAt?: number;
}): TrainingSession {
  const subtype = `skill:${skillId}:${band}` as const;
  const session = createTrainingSession({
    userId,
    questionType: "skill_drill",
    subtype,
    questionCount: 10,
    generationContext: context(startedAt + skillId.length),
    now: startedAt,
  });
  const records: QuestionRecord[] = session.questions.map((question) => ({
    question,
    userAnswer: correct ? question.answer : "__wrong__",
    isCorrect: correct,
    accuracyLevel: correct ? "exact" : "wrong",
    timeUsedMs,
    restartCount: 0,
    usedScratchpad: false,
    timingInterrupted,
    skipped: false,
  }));
  return {
    ...session,
    records,
    currentIndex: session.questions.length,
    status: "completed",
    accumulatedMs: timeUsedMs * session.questions.length,
    runningSince: null,
    completedAt: startedAt + timeUsedMs * session.questions.length,
  };
}

function pathComparisonCompletedSession(userId = "fish"): TrainingSession {
  const question = generatePathComparisonSet("L2", 1, context(99))[0];
  const stepSpecs = question.stepSpecs ?? [];
  const durations = [900, 1_800, 2_700, 200];
  const steps = stepSpecs.map((spec, index) => ({
    stepId: spec.id,
    stepSkillId: spec.stepSkillId,
    stepType: spec.stepType,
    userValue:
      spec.stepType === "path_preference" ? "direct" : spec.expectedValue,
    expectedValue: spec.expectedValue,
    decisionValue:
      spec.stepType === "path_preference" ? "direct" : undefined,
    isCorrect: true,
    durationMs: durations[index],
    submitCount: 1,
    editCount: 0,
    skipped: false,
    timingInterrupted: false,
  }));
  const record: QuestionRecord = {
    question,
    userAnswer: "direct",
    isCorrect: true,
    accuracyLevel: "exact",
    timeUsedMs: durations.reduce((sum, value) => sum + value, 0),
    restartCount: 0,
    usedScratchpad: false,
    timingInterrupted: false,
    skipped: false,
    steps,
  };
  return {
    id: `path-${userId}`,
    userId,
    questionType: "skill_drill",
    subtype: "path_compare:L2",
    questionCount: 1,
    questions: [question],
    currentIndex: 1,
    records: [record],
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: record.timeUsedMs,
    runningSince: null,
    pauseDurationMs: 0,
    status: "completed",
    startedAt: 100,
    completedAt: 6_000,
    schemaVersion: 2,
    trainingMode: "path_compare",
    difficultyBand: "L2",
  };
}

const expectedNonDirectSkillDrills = [
  "A-MUL-03",
  "A-MUL-04",
  "A-MUL-05",
  "A-MUL-06",
  "A-MUL-07",
  "A-ADD-01",
  "A-SUB-01",
  "A-SUB-02",
  "A-SUB-03",
  "A-SUB-04",
  "A-SUB-05",
  "A-FRA-01",
  "A-FRA-02",
  "A-FRA-03",
  "A-FRA-04",
  "C-MUL-01",
  "C-DIV-01",
  "C-DIV-02",
  "C-DIV-03",
  "C-DIV-04",
] as const;

describe("stage4 whole-program acceptance", () => {
  it("keeps the 160-skill tree intact and explicitly inventories the 140 direct drills", () => {
    expect(skillDefinitions).toHaveLength(160);
    expect(implementedSkillIds).toHaveLength(140);
    expect(new Set(implementedSkillIds).size).toBe(140);

    const direct = new Set<SkillId>(implementedSkillIds);
    const nonDirect = skillDefinitions
      .map((definition) => definition.id)
      .filter((skillId) => !direct.has(skillId));
    expect(nonDirect).toEqual(expectedNonDirectSkillDrills);
  });

  it("can generate every directly implemented skill in all three difficulty bands", () => {
    const bands: DifficultyBand[] = ["L1", "L2", "L3"];
    implementedSkillIds.forEach((skillId, skillIndex) => {
      bands.forEach((band, bandIndex) => {
        const questions = generateSkillDrillSet(
          skillId,
          band,
          1,
          context(1_000 + skillIndex * 10 + bandIndex),
        );
        expect(questions).toHaveLength(1);
        expect(questions[0].skillId).toBe(skillId);
        expect(questions[0].difficultyBand).toBe(band);
        expect(questions[0].masteryProfile).toBeTruthy();
        expect(questions[0].inputKind).toBeTruthy();
      });
    });
  });

  it("enforces 10/20 for new sessions while preserving frozen 30-question compatibility", () => {
    expect(() =>
      createTrainingSession({
        userId: "fish",
        questionType: "skill_drill",
        subtype: "skill:A-MUL-01:L2",
        questionCount: 30,
        generationContext: context(2),
      }),
    ).toThrow("Invalid question count");

    const frozen = createTrainingSession({
      userId: "fish",
      questionType: "two_digit_add_subtract",
      subtype: "standard",
      questionCount: 30,
      questions: Array.from({ length: 30 }, (_, index) => ({
        id: `legacy-${index}`,
        type: "two_digit_add_subtract" as const,
        subtype: "standard" as const,
        prompt: `${index}+1`,
        answer: String(index + 1),
        data: {},
        difficulty: { level: 1 as const, tags: [] },
        primaryStructure: "legacy",
        secondaryTags: [],
        generationRuleVersion: "legacy",
      })),
    });
    expect(frozen.questions).toHaveLength(30);
  });

  it("creates mixed training only from the current user's learned skills", () => {
    const fishHistory = [
      completedSkillSession({ skillId: "A-MUL-01", userId: "fish", startedAt: 10 }),
      completedSkillSession({ skillId: "B-R-03", userId: "fish", startedAt: 20 }),
      completedSkillSession({ skillId: "A-PCT-02", userId: "cat", startedAt: 30 }),
    ];
    const mixed = createTrainingSession({
      userId: "fish",
      questionType: "skill_drill",
      subtype: "mixed:L2",
      questionCount: 10,
      history: fishHistory,
      generationContext: context(3),
    });
    expect(mixed.trainingMode).toBe("mixed");
    expect(new Set(mixed.questions.map((question) => question.skillId))).toEqual(
      new Set(["A-MUL-01", "B-R-03"]),
    );
    expect(mixed.questions.every((question) => question.inputKind !== "steps")).toBe(true);
  });

  it("keeps mastery separated by user and distinguishes mastered / accuracy-first / speed-limited", () => {
    const history: TrainingSession[] = [];
    for (let index = 0; index < 3; index += 1) {
      history.push(
        completedSkillSession({
          skillId: "A-MUL-01",
          userId: "fish",
          startedAt: 100 + index,
          timeUsedMs: 1_000,
        }),
      );
      history.push(
        completedSkillSession({
          skillId: "A-MUL-02",
          userId: "fish",
          startedAt: 200 + index,
          timeUsedMs: 4_000,
        }),
      );
    }
    history.push(
      completedSkillSession({
        skillId: "A-MUL-01",
        userId: "cat",
        startedAt: 300,
        correct: false,
      }),
    );
    history.push(
      completedSkillSession({ skillId: "A-MUL-01", userId: "cat", startedAt: 301 }),
      completedSkillSession({ skillId: "A-MUL-01", userId: "cat", startedAt: 302 }),
    );

    const fish = masteryMatrix(history, "fish");
    expect(fish.find((item) => item.skillId === "A-MUL-01")?.status).toBe("mastered");
    expect(fish.find((item) => item.skillId === "A-MUL-02")?.status).toBe("speed_limited");

    const cat = masteryMatrix(history, "cat");
    expect(cat.find((item) => item.skillId === "A-MUL-01")?.status).toBe("accuracy_first");
  });

  it("retains interrupted attempts for accuracy but excludes their extreme time from speed", () => {
    const history = [
      completedSkillSession({
        skillId: "A-MUL-01",
        userId: "fish",
        startedAt: 1,
        timeUsedMs: 999_999,
        timingInterrupted: true,
      }),
      completedSkillSession({ skillId: "A-MUL-01", userId: "fish", startedAt: 2 }),
      completedSkillSession({ skillId: "A-MUL-01", userId: "fish", startedAt: 3 }),
    ];
    const summary = masteryMatrix(history, "fish").find(
      (item) => item.skillId === "A-MUL-01",
    );
    expect(summary?.sampleCount).toBe(30);
    expect(summary?.timedSampleCount).toBe(20);
    expect(summary?.status).toBe("mastered");
  });

  it("limits automatic recommendations to two actionable targets", () => {
    const history: TrainingSession[] = [];
    for (let index = 0; index < 3; index += 1) {
      history.push(
        completedSkillSession({
          skillId: "A-MUL-01",
          userId: "fish",
          correct: false,
          startedAt: 400 + index,
        }),
        completedSkillSession({
          skillId: "A-MUL-02",
          userId: "fish",
          timeUsedMs: 5_000,
          startedAt: 500 + index,
        }),
        completedSkillSession({
          skillId: "A-PCT-02",
          userId: "fish",
          correct: false,
          startedAt: 600 + index,
        }),
      );
    }
    const recommendations = recommendTraining(history, "fish", 10);
    expect(recommendations).toHaveLength(2);
    expect(recommendations.every((item) => item.status !== "mastered")).toBe(true);
  });

  it("uses one identical division problem for direct / split / scale path comparison", () => {
    const question = generatePathComparisonSet("L3", 1, context(4))[0];
    const prompts = question.stepSpecs?.slice(0, 3).map((step) => step.prompt) ?? [];
    const numerator = String(question.data.numerator);
    const denominator = String(question.data.denominator);
    expect(prompts).toHaveLength(3);
    expect(prompts.every((prompt) => prompt.includes(numerator) && prompt.includes(denominator))).toBe(true);
    expect(question.stepSpecs?.[3].allowedAnswerSet).toEqual(["direct", "split", "scale"]);
  });

  it("summarizes each learner's path timing separately and does not hard-code a best route", () => {
    const fish = pathComparisonCompletedSession("fish");
    const cat = pathComparisonCompletedSession("cat");
    cat.records[0].steps = cat.records[0].steps?.map((step) => ({
      ...step,
      durationMs:
        step.stepType === "path_scale"
          ? 500
          : step.stepType === "path_direct"
            ? 3_000
            : step.durationMs,
    }));

    const fishSummary = summarizePathComparisons([fish, cat], "fish");
    const catSummary = summarizePathComparisons([fish, cat], "cat");
    expect(fishSummary.fastestRoute).toBe("direct");
    expect(catSummary.fastestRoute).toBe("scale");
    expect(fishSummary.routes.every((route) => route.sampleCount === 1)).toBe(true);
    expect(catSummary.routes.every((route) => route.sampleCount === 1)).toBe(true);
  });
});
