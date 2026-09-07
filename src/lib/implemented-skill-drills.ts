import { GenerationContext, productionGenerationContext } from "./generate";
import {
  Batch4SkillId,
  batch4SkillIds,
  generateBatch4SkillSet,
  gradeBatch4SkillQuestion,
  isBatch4SkillId,
} from "./batch4-skill-generate";
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
] as const satisfies readonly SkillId[];

export type ImplementedSkillId = FoundationSkillId | Batch4SkillId;

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
  return isFoundationSkillId(skillId)
    ? generateFoundationSkillSet(skillId, difficultyBand, count, context)
    : generateBatch4SkillSet(skillId, difficultyBand, count, context);
}

export function gradeSkillDrillQuestion(
  question: GeneratedQuestion,
  input: string,
) {
  if (isBatch4SkillId(question.skillId)) {
    return gradeBatch4SkillQuestion(question, input);
  }
  if (isFoundationSkillId(question.skillId)) {
    return gradeFoundationSkillQuestion(question, input);
  }
  throw new Error("Question does not use an implemented skill drill.");
}
