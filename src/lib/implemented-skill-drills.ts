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
  Batch6DivisionScaleSkillId,
  batch6DivisionScaleSkillIds,
  generateBatch6DivisionScaleSet,
  gradeBatch6DivisionScaleQuestion,
  isBatch6DivisionScaleSkillId,
} from "./batch6-division-scale-generate";
import {
  Batch7SkillId,
  batch7SkillIds,
  generateBatch7SkillSet,
  gradeBatch7SkillQuestion,
  isBatch7SkillId,
} from "./batch7-skill-generate";
import { GenerationContext, productionGenerationContext } from "./generate";
import {
  FoundationSkillId,
  foundationSkillIds,
  generateFoundationSkillSet,
  gradeFoundationSkillQuestion,
  isFoundationSkillId,
} from "./skill-generate";
import {
  generateStabilizationSkillSet,
  gradeStabilizationSkillQuestion,
  isStabilizationSkillId,
  StabilizationSkillId,
  stabilizationSkillIds,
} from "./stabilization-skill-generate";
import { DifficultyBand, GeneratedQuestion, SkillId } from "./types";

export const implementedSkillIds = [
  ...foundationSkillIds,
  ...batch4SkillIds,
  ...batch5SplitSkillIds,
  ...batch6DivisionScaleSkillIds,
  ...batch7SkillIds,
  ...stabilizationSkillIds,
] as const satisfies readonly SkillId[];

export type ImplementedSkillId =
  | FoundationSkillId
  | Batch4SkillId
  | Batch5SplitSkillId
  | Batch6DivisionScaleSkillId
  | Batch7SkillId
  | StabilizationSkillId;

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
  if (isBatch5SplitSkillId(skillId))
    return generateBatch5SplitSet(skillId, difficultyBand, count, context);
  if (isBatch6DivisionScaleSkillId(skillId))
    return generateBatch6DivisionScaleSet(
      skillId,
      difficultyBand,
      count,
      context,
    );
  if (isBatch7SkillId(skillId))
    return generateBatch7SkillSet(skillId, difficultyBand, count, context);
  return generateStabilizationSkillSet(
    skillId,
    difficultyBand,
    count,
    context,
  );
}

export function gradeSkillDrillQuestion(
  question: GeneratedQuestion,
  input: string,
) {
  if (isStabilizationSkillId(question.skillId)) {
    return gradeStabilizationSkillQuestion(question, input);
  }
  if (isBatch7SkillId(question.skillId)) {
    return gradeBatch7SkillQuestion(question, input);
  }
  if (isBatch6DivisionScaleSkillId(question.skillId)) {
    return gradeBatch6DivisionScaleQuestion(question, input);
  }
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
