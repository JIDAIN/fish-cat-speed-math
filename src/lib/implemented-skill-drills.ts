import {
  CanonicalAAbilityId,
  canonicalAAbilityIds,
  isCanonicalAAbilityId,
} from "./a-abilities";
import {
  generateCanonicalASet,
  gradeCanonicalAQuestion,
} from "./canonical-a-generate";
import { GenerationContext, productionGenerationContext } from "./generate";
import { DifficultyBand, GeneratedQuestion } from "./types";

export const implementedSkillIds = canonicalAAbilityIds;
export type ImplementedSkillId = CanonicalAAbilityId;

export function isImplementedSkillId(
  value: unknown,
): value is ImplementedSkillId {
  return isCanonicalAAbilityId(value);
}

export function generateSkillDrillSet(
  skillId: ImplementedSkillId,
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  return generateCanonicalASet(skillId, difficultyBand, count, context);
}

export function gradeSkillDrillQuestion(
  question: GeneratedQuestion,
  input: string,
) {
  if (!isCanonicalAAbilityId(question.skillId))
    throw new Error("Question does not use a canonical A ability.");
  return gradeCanonicalAQuestion(question, input);
}
