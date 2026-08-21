import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FractionPercentMatchPKPage } from "./FractionPercentMatchPKPage";
import { createMatchBlueprint, matchBlueprintFingerprint } from "@/lib/fraction-percent-match";

const blueprint = createMatchBlueprint(() => 0.42);
const now = Date.now();
const challenge = (status: "pending" | "completed", completedAt?: number) => ({ id: "a", challengerId: "fish-id", challengerRole: "fish" as const, opponentId: "cat-id", opponentRole: "cat" as const, challengerRecordId: "fish-record", opponentRecordId: status === "completed" ? "cat-record" : undefined, blueprint, blueprintFingerprint: matchBlueprintFingerprint(blueprint), relationSetVersion: "1.0.0", gameVersion: "1.0.0", status, createdAt: now, completedAt });
const records = [{ id: "fish-record", userId: "fish" as const, ownerAccountId: "fish-id", startedAt: 1, completedAt: 2, totalTimeMs: 42700, relationCount: 32 as const, relationSetVersion: "1.0.0", gameVersion: "1.0.0" }, { id: "cat-record", userId: "cat" as const, ownerAccountId: "cat-id", startedAt: 1, completedAt: 2, totalTimeMs: 45100, relationCount: 32 as const, relationSetVersion: "1.0.0", gameVersion: "1.0.0" }];

describe("FractionPercentMatchPKPage", () => {
  afterEach(cleanup);
  it("hides a pending challenger's score from the opponent", () => {
    render(<FractionPercentMatchPKPage challenges={[challenge("pending")]} records={records} identityId="cat-id" onHome={() => undefined} onStart={() => undefined} />);
    expect(screen.queryByText("42.7秒")).toBeNull();
  });
  it("shows identities and outcome only after completion", () => {
    render(<FractionPercentMatchPKPage challenges={[challenge("completed", now)]} records={records} identityId="cat-id" onHome={() => undefined} onStart={() => undefined} />);
    expect(screen.getByText((_, node) => node?.textContent === "🐟 小鱼　42.7秒")).toBeTruthy();
    expect(screen.getByText((_, node) => node?.textContent === "🐱 小猫　45.1秒")).toBeTruthy();
    expect(screen.getByText(/🐟胜/)).toBeTruthy();
  });
  it("does not invent a zero time or draw while completed records are loading", () => {
    render(<FractionPercentMatchPKPage challenges={[challenge("completed", now)]} records={[]} identityId="cat-id" onHome={() => undefined} onStart={() => undefined} />);
    expect(screen.queryByText(/0\.0秒|平局/)).toBeNull();
    expect(screen.getAllByText(/成绩读取中…/)).toHaveLength(3);
  });
  it("filters completed challenges older than seven days", () => {
    render(<FractionPercentMatchPKPage challenges={[challenge("completed", now - 8 * 24 * 60 * 60 * 1000)]} records={records} identityId="cat-id" onHome={() => undefined} onStart={() => undefined} />);
    expect(screen.getByText("近7日暂无已完成PK。")).toBeTruthy();
  });
});
