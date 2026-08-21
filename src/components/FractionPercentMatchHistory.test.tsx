import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ capability: "ready", outcomes: [] as boolean[], sync: vi.fn(), saved: [] as unknown[] }));
vi.mock("@/lib/fraction-percent-match-cloud", () => ({
  checkFractionPercentMatchCloudCapability: vi.fn(() => Promise.resolve(state.capability)),
  readMatchHistory: vi.fn(() => Promise.resolve([])),
  syncOwnedMatchRecord: (...args: unknown[]) => state.sync(...args),
}));
vi.mock("@/lib/fraction-percent-match-storage", () => ({
  readMatchRecords: vi.fn(() => Promise.resolve([1, 2, 3].map((n) => ({ id: `r${n}`, userId: "fish", ownerAccountId: "fish-id", startedAt: n, completedAt: n, totalTimeMs: n, relationCount: 32, relationSetVersion: "1.0.0", gameVersion: "1.0.0", syncStatus: "failed" })))),
  saveMatchRecord: vi.fn((record) => { state.saved.push(record); return Promise.resolve(); }),
}));
vi.mock("@/lib/fraction-percent-match-pk-cloud", () => ({ submitMatchPKResult: vi.fn() }));
import { FractionPercentMatchHistory } from "./FractionPercentMatchHistory";
import { FractionPercentMatchRecord } from "@/lib/fraction-percent-match";

describe("FractionPercentMatchHistory retry all", () => {
  afterEach(cleanup);
  beforeEach(() => {
    state.capability = "ready"; state.saved = []; state.outcomes = [];
    state.sync.mockReset();
    state.sync.mockImplementation((record: FractionPercentMatchRecord) => Promise.resolve(state.outcomes.shift() ? { ok: true, record: { ...record, syncStatus: "synced" } } : { ok: false, reason: "server" }));
  });
  const renderHistory = () => render(<FractionPercentMatchHistory identity={{ id: "fish-id", role: "fish", email: "fish@test" }} userId="fish" onHome={() => undefined} onGame={() => undefined} />);
  const expectBulkResult = async (outcomes: boolean[], message: string) => {
    state.outcomes = outcomes;
    renderHistory();
    await screen.findByText("重试全部同步"); fireEvent.click(screen.getByText("重试全部同步"));
    await screen.findByText(message);
    expect(state.sync).toHaveBeenCalledTimes(3);
  };
  it("reports three genuine successes", () => expectBulkResult([true, true, true], "成功同步 3 条，失败 0 条"));
  it("reports partial failure without inflating success", () => expectBulkResult([true, true, false], "成功同步 2 条，失败 1 条"));
  it("reports all failures as zero successes", () => expectBulkResult([false, false, false], "成功同步 0 条，失败 3 条"));
  it("does not invoke per-record sync or falsely change records when schema is unavailable", async () => {
    state.capability = "base_not_deployed";
    renderHistory(); await screen.findByText("重试全部同步"); fireEvent.click(screen.getByText("重试全部同步"));
    await screen.findByText(/3条记录仍安全保存在本机/);
    expect(state.sync).not.toHaveBeenCalled();
    expect(state.saved).toEqual([]);
  });
  it("does not offer a fish record for sync while signed in as cat", async () => {
    render(<FractionPercentMatchHistory identity={{ id: "cat-id", role: "cat", email: "cat@test" }} userId="cat" onHome={() => undefined} onGame={() => undefined} />);
    await waitFor(() => expect(screen.queryByText("重试同步")).toBeNull());
  });
});
