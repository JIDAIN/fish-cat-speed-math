import { describe, expect, it } from "vitest";
import { FRACTION_PERCENT_LIBRARY } from "./generate";
import {
  createMatchRounds,
  createMatchBlueprint,
  FRACTION_PERCENT_MATCH_KEYS,
  matchBlueprintFingerprint,
  matchRelations,
  relationKey,
  validateMatchBlueprint,
} from "./fraction-percent-match";

describe("fraction percent match", () => {
  it("selects exactly 32 core relations from the one fixed library", () => {
    expect(matchRelations).toHaveLength(32);
    expect(
      matchRelations.every((relation) =>
        FRACTION_PERCENT_LIBRARY.includes(relation),
      ),
    ).toBe(true);
    ["1/4", "1/5", "1/20", "1/25", "1/40", "1/50", "5/7", "7/8", "8/9"].forEach(
      (key) => expect(FRACTION_PERCENT_MATCH_KEYS).toContain(key),
    );
    [
      "1/10",
      "3/4",
      "2/5",
      "3/5",
      "4/5",
      "4/9",
      "5/9",
      "7/9",
      "5/12",
      "7/12",
      "11/12",
      "3/16",
      "5/16",
      "7/16",
    ].forEach((key) => expect(FRACTION_PERCENT_MATCH_KEYS).not.toContain(key));
  });
  it("makes four complete eight-relation 4x4 rounds without omission", () => {
    const rounds = createMatchRounds(() => 0.42);
    expect(rounds).toHaveLength(4);
    expect(rounds.every((round) => round.length > 0)).toBeTruthy();
    expect(
      rounds.every(
        (round) =>
          round.length === 16 &&
          round.filter((card) => card.kind === "fraction").length === 8 &&
          round.filter((card) => card.kind === "percent").length === 8,
      ),
    ).toBe(true);
    const keys = rounds.flatMap((round) =>
      round
        .filter((card) => card.kind === "fraction")
        .map((card) => card.relationKey),
    );
    expect(new Set(keys)).toEqual(new Set(matchRelations.map(relationKey)));
  });
  it("validates and fingerprints a frozen board independently of object property order", () => {
    const blueprint = createMatchBlueprint(() => 0.42);
    expect(validateMatchBlueprint(blueprint)).toBe(true);
    expect(matchBlueprintFingerprint(blueprint)).toBe(matchBlueprintFingerprint(JSON.parse(JSON.stringify(blueprint))));
    expect(validateMatchBlueprint({ rounds: blueprint.rounds.slice(0, 3) })).toBe(false);
  });
});
