import { GenerationContext, productionGenerationContext } from "./generate";
import {
  Batch4SkillId,
  batch4SkillIds,
  generateBatch4SkillSet,
  gradeBatch4SkillQuestion,
  isBatch4SkillId,
} from "./batch4-skill-generate";
import {
  Batch5SplitSkillId,
  batch5SplitSkillIds,
  generateBatch5SplitSet,
  gradeBatch5SplitQuestion,
  isBatch5SplitSkillId,
} from "./batch5-split-generate";
import {
  FoundationSkillId,
  foundationSkillIds,
  generateFoundationSkillSet,
  gradeFoundationSkillQuestion,
  isFoundationSkillId,
} from "./skill-generate";
import { DifficultyBand, GeneratedQuestion, SkillId } from "./types";

export const implementedSkillIds = [
  ...foundationSkillIds,
  ...batch4SkillIds,
  ...batch5SplitSkillIds,
] as const satisfies readonly SkillId[];

export type ImplementedSkillId =
  | FoundationSkillId
  | Batch4SkillId
  | Batch5SplitSkillId;

const implementedSkillSet = new Set<string>(implementedSkillIds);

export function isImplementedSkillId(
  value: unknown,
): value is ImplementedSkillId {
  return typeof value === "string" && implementedSkillSet.has(value);
}

export function generateSkillDrillSet(
  skillId: ImplementedSkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (isFoundationSkillId(skillId))
    return generateFoundationSkillSet(skillId, difficultyBand, count, context);
  if (isBatch4SkillId(skillId))
    return generateBatch4SkillSet(skillId, difficultyBand, count, context);
  return generateBatch5SplitSet(skillId, difficultyBand, count, context);
}

export function gradeSkillDrillQuestion(
  question: GeneratedQuestion,
  input: string,
) {
  if (isBatch5SplitSkillId(question.skillId)) {
    return gradeBatch5SplitQuestion(question, input);
  }
  if (isBatch4SkillId(question.skillId)) {
    return gradeBatch4SkillQuestion(question, input);
  }
  if (isFoundationSkillId(question.skillId)) {
    return gradeFoundationSkillQuestion(question, input);
  }
  throw new Error("Question does not use an implemented skill drill.");
}
