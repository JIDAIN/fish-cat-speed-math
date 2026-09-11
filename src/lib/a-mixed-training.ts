import {
  CanonicalAAbilityId,
  isCanonicalAAbilityId,
} from "./a-abilities";
import { generateCanonicalASet } from "./canonical-a-generate";
import { GenerationContext, productionGenerationContext } from "./generate";
import { DifficultyBand, GeneratedQuestion } from "./types";

export const A_MIXED_TRAINING_VERSION = "a-mixed-1.0.0";

function randomInteger(context: GenerationContext, min: number, max: number) {
  return Math.floor(context.random() * (max - min + 1)) + min;
}

function shuffle<T>(context: GenerationContext, values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomInteger(context, 0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function generateCanonicalAMixedSet(
  learnedAbilityIds: readonly string[],
  difficultyBand: DifficultyBand,
  count: number,
  context: GenerationContext = productionGenerationContext,
): GeneratedQuestion[] {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("题量必须是正整数。");

  const eligible = Array.from(
    new Set(learnedAbilityIds.filter(isCanonicalAAbilityId)),
  ) as CanonicalAAbilityId[];
  if (eligible.length < 2)
    throw new Error("日常混合训练至少需要先完成2个A层专项。先做两个专项，再回来开启混合训练。");

  const selected = shuffle(context, eligible).slice(
    0,
    Math.min(5, eligible.length),
  );
  return Array.from({ length: count }, (_, index) => {
    const abilityId = selected[index % selected.length];
    const question = generateCanonicalASet(
      abilityId,
      difficultyBand,
      1,
      context,
    )[0];
    return {
      ...question,
      structureTags: Array.from(
        new Set([...(question.structureTags ?? []), "a_mixed_training"]),
      ),
      generatorParams: {
        ...(question.generatorParams ?? {}),
        mixedTrainingVersion: A_MIXED_TRAINING_VERSION,
        mixedAbilityCount: selected.length,
      },
    };
  });
}
