import { describe, expect, it } from "vitest";
import { normalizeLegacyMatchRecord } from "./fraction-percent-match-storage";

describe("normalizeLegacyMatchRecord", () => {
  it("preserves legacy identity and timestamps while adding safe match defaults", () => {
    const value = normalizeLegacyMatchRecord({ id: "old-160-5", userId: "fish", ownerAccountId: "fish-account", startedAt: 1, completedAt: 160500, totalTimeMs: 160500, relationCount: 32 });
    expect(value).toMatchObject({ id: "old-160-5", ownerAccountId: "fish-account", completedAt: 160500, totalTimeMs: 160500, relationSetVersion: "1.0.0", gameVersion: "1.0.0", trainingSource: "normal" });
  });
});
