import { FRACTION_PERCENT_LIBRARY, FractionPercentRelation } from "./generate";

export const FRACTION_PERCENT_MATCH_RELATION_SET_VERSION = "1.0.0";
export const FRACTION_PERCENT_MATCH_GAME_VERSION = "1.0.0";

/** Keys only: percentage answers remain single-sourced in FRACTION_PERCENT_LIBRARY. */
export const FRACTION_PERCENT_MATCH_KEYS = [
  "1/3",
  "1/4",
  "1/5",
  "1/6",
  "1/7",
  "1/8",
  "1/9",
  "1/11",
  "1/12",
  "1/13",
  "1/14",
  "1/15",
  "1/16",
  "1/17",
  "1/18",
  "1/19",
  "1/20",
  "1/25",
  "1/40",
  "1/50",
  "2/3",
  "5/6",
  "2/7",
  "3/7",
  "4/7",
  "5/7",
  "6/7",
  "3/8",
  "5/8",
  "7/8",
  "2/9",
  "8/9",
] as const;

export const relationKey = (
  relation: Pick<FractionPercentRelation, "numerator" | "denominator">,
) => `${relation.numerator}/${relation.denominator}`;

export const matchRelations = FRACTION_PERCENT_LIBRARY.filter((relation) =>
  (FRACTION_PERCENT_MATCH_KEYS as readonly string[]).includes(
    relationKey(relation),
  ),
);

if (matchRelations.length !== FRACTION_PERCENT_MATCH_KEYS.length)
  throw new Error("百分互换消消乐核心关系未能从固定题库完整解析。");

export type MatchCard = {
  id: string;
  relationKey: string;
  kind: "fraction" | "percent";
  label: string;
  numerator: number;
  denominator: number;
};
export type MatchGameBlueprint = { rounds: MatchCard[][] };

/** Validates the frozen board independently of any UI state. */
export function validateMatchBlueprint(blueprint: MatchGameBlueprint): boolean {
  if (!Array.isArray(blueprint?.rounds) || blueprint.rounds.length !== 4)
    return false;
  const all = new Set<string>();
  for (const round of blueprint.rounds) {
    if (!Array.isArray(round) || round.length !== 16) return false;
    const fractions = round.filter((card) => card?.kind === "fraction");
    const percents = round.filter((card) => card?.kind === "percent");
    if (fractions.length !== 8 || percents.length !== 8) return false;
    const keys = new Set(round.map((card) => card?.relationKey));
    if (keys.size !== 8 || [...keys].some((key) => !FRACTION_PERCENT_MATCH_KEYS.includes(key as never))) return false;
    for (const key of keys) {
      if (round.filter((card) => card.relationKey === key && card.kind === "fraction").length !== 1 ||
          round.filter((card) => card.relationKey === key && card.kind === "percent").length !== 1 || all.has(key)) return false;
      all.add(key);
    }
  }
  return all.size === FRACTION_PERCENT_MATCH_KEYS.length;
}

/** Property-order-independent, versioned fingerprint for the frozen card order. */
export function matchBlueprintFingerprint(blueprint: MatchGameBlueprint): string {
  if (!validateMatchBlueprint(blueprint)) throw new Error("Invalid match blueprint");
  const canonical = blueprint.rounds.map((round, roundIndex) =>
    round.map((card, cardIndex) => `${roundIndex}:${cardIndex}:${card.relationKey}:${card.kind}`).join("|")
  ).join(";");
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fpv1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function createMatchRounds(random = Math.random): MatchCard[][] {
  return shuffle(matchRelations, random)
    .reduce<MatchCard[][]>((rounds, relation, index) => {
      const round = Math.floor(index / 8);
      if (!rounds[round]) rounds[round] = [];
      const key = relationKey(relation);
      rounds[round].push(
        {
          id: `${key}:fraction`,
          relationKey: key,
          kind: "fraction",
          label: key,
          numerator: relation.numerator,
          denominator: relation.denominator,
        },
        {
          id: `${key}:percent`,
          relationKey: key,
          kind: "percent",
          label: `${relation.percentAnswer}%`,
          numerator: relation.numerator,
          denominator: relation.denominator,
        },
      );
      return rounds;
    }, [])
    .map((round) => shuffle(round, random));
}
export function createMatchBlueprint(random = Math.random): MatchGameBlueprint {
  return { rounds: createMatchRounds(random) };
}
export function cloneMatchBlueprint(
  blueprint: MatchGameBlueprint,
): MatchGameBlueprint {
  return {
    rounds: blueprint.rounds.map((round) => round.map((card) => ({ ...card }))),
  };
}

export type FractionPercentMatchRecord = {
  id: string;
  userId: "fish" | "cat";
  ownerAccountId?: string;
  startedAt: number;
  completedAt: number;
  totalTimeMs: number;
  relationCount: 32;
  relationSetVersion: string;
  gameVersion: string;
  syncedAt?: number;
  syncStatus?: "not_synced" | "syncing" | "synced" | "failed";
  trainingSource?: "normal" | "pk";
  pkChallengeId?: string;
  blueprintFingerprint?: string;
  pkSyncStatus?: "not_synced" | "syncing" | "synced" | "failed";
};

export function createMatchRecord(
  input: Omit<
    FractionPercentMatchRecord,
    "id" | "relationCount" | "relationSetVersion" | "gameVersion" | "syncStatus"
  > & { id?: string },
): FractionPercentMatchRecord {
  return {
    ...input,
    id: input.id ?? globalThis.crypto.randomUUID(),
    relationCount: 32,
    relationSetVersion: FRACTION_PERCENT_MATCH_RELATION_SET_VERSION,
    gameVersion: FRACTION_PERCENT_MATCH_GAME_VERSION,
    syncStatus: input.ownerAccountId ? "not_synced" : undefined,
  };
}
