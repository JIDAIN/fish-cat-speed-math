import {
  canonicalAAbilityDefinitions,
  CanonicalAAbilityId,
  getCanonicalAAbilityDefinition,
  isCanonicalAAbilityId,
} from "./a-abilities";
import { SkillId } from "./types";

export type SkillDefinition = (typeof canonicalAAbilityDefinitions)[number];

/**
 * Current formal registry contains only the eight canonical A abilities.
 * The former 160-leaf A/B/C registry had no real learner data and has been
 * removed; classic QuestionType/Subtype history remains compatible separately.
 */
export const skillDefinitions = canonicalAAbilityDefinitions;
export const skillRegistry = Object.freeze(
  Object.fromEntries(
    canonicalAAbilityDefinitions.map((definition) => [definition.id, definition]),
  ),
) as Readonly<Record<CanonicalAAbilityId, SkillDefinition>>;

export function isRegisteredSkillId(
  value: unknown,
): value is CanonicalAAbilityId {
  return isCanonicalAAbilityId(value);
}

export function getSkillDefinition(skillId: SkillId): SkillDefinition {
  if (!isCanonicalAAbilityId(skillId))
    throw new Error(`Unknown canonical A ability: ${skillId}`);
  return getCanonicalAAbilityDefinition(skillId);
}
