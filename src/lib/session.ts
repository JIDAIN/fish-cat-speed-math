import {
  generateSet,
  GenerationContext,
  productionGenerationContext,
} from "./generate";
import { isValidQuestionCount } from "./question-count";
import { QuestionType, Subtype, TrainingSession } from "./types";

interface CreateTrainingSessionOptions {
  userId: string;
  questionType: QuestionType;
  subtype: Subtype;
  questionCount: number;
  now?: number;
  createSessionId?: () => string;
  generationContext?: GenerationContext;
}

/** Creates one entirely fresh training run from frozen training parameters. */
export function createTrainingSession({
  userId,
  questionType,
  subtype,
  questionCount,
  now = Date.now(),
  createSessionId = () => globalThis.crypto.randomUUID(),
  generationContext = productionGenerationContext,
}: CreateTrainingSessionOptions): TrainingSession {
  if (!isValidQuestionCount(questionCount)) {
    throw new RangeError("Invalid question count");
  }

  return {
    id: createSessionId(),
    userId,
    questionType,
    subtype,
    questionCount,
    questions: generateSet(
      questionType,
      subtype,
      questionCount,
      generationContext,
    ),
    currentIndex: 0,
    records: [],
    currentAnswer: "",
    currentRestartCount: 0,
    accumulatedMs: 0,
    runningSince: now,
    pauseDurationMs: 0,
    status: "active",
    startedAt: now,
  };
}
