import { MasteryProfile, StructuredInputKind } from "./types";

export const canonicalAAbilityIds = [
  "A-ADD-01",
  "A-SUB-01",
  "A-COM-01",
  "A-MUL-01",
  "A-MUL-02",
  "A-MUL-03",
  "A-FRA-01",
  "A-PCT-01",
] as const;

export type CanonicalAAbilityId = (typeof canonicalAAbilityIds)[number];

export type CanonicalAAbilityDefinition = {
  id: CanonicalAAbilityId;
  displayName: string;
  group: string;
  masteryProfile: MasteryProfile;
  inputKind: StructuredInputKind;
};

const definitions: readonly CanonicalAAbilityDefinition[] = [
  {
    id: "A-ADD-01",
    displayName: "2～3位加法",
    group: "加减与差值",
    masteryProfile: "C",
    inputKind: "number",
  },
  {
    id: "A-SUB-01",
    displayName: "2～3位减法",
    group: "加减与差值",
    masteryProfile: "C",
    inputKind: "number",
  },
  {
    id: "A-COM-01",
    displayName: "近邻小差值",
    group: "加减与差值",
    masteryProfile: "R",
    inputKind: "choice",
  },
  {
    id: "A-MUL-01",
    displayName: "正向乘法口诀",
    group: "乘法基础",
    masteryProfile: "R",
    inputKind: "choice",
  },
  {
    id: "A-MUL-02",
    displayName: "逆向乘法口诀",
    group: "乘法基础",
    masteryProfile: "R",
    inputKind: "choice",
  },
  {
    id: "A-MUL-03",
    displayName: "两位数×一位数",
    group: "乘法基础",
    masteryProfile: "C",
    inputKind: "number",
  },
  {
    id: "A-FRA-01",
    displayName: "高频分数 ↔ 百分数",
    group: "分百固定反应",
    masteryProfile: "R",
    inputKind: "choice",
  },
  {
    id: "A-PCT-01",
    displayName: "基础百分比取值",
    group: "百分比取值",
    masteryProfile: "C",
    inputKind: "number",
  },
] as const;

export const canonicalAAbilityDefinitions = Object.freeze(definitions);

const definitionMap = new Map<CanonicalAAbilityId, CanonicalAAbilityDefinition>(
  definitions.map((definition) => [definition.id, definition]),
);

export function isCanonicalAAbilityId(
  value: unknown,
): value is CanonicalAAbilityId {
  return (
    typeof value === "string" &&
    canonicalAAbilityIds.includes(value as CanonicalAAbilityId)
  );
}

export function getCanonicalAAbilityDefinition(
  abilityId: CanonicalAAbilityId,
): CanonicalAAbilityDefinition {
  const definition = definitionMap.get(abilityId);
  if (!definition) throw new Error(`Unknown canonical A ability: ${abilityId}`);
  return definition;
}
