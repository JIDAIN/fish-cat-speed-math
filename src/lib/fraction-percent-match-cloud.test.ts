import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeDb = { rpc: (...args: unknown[]) => Promise<{ data?: unknown; error?: unknown }>; from: (...args: unknown[]) => unknown };
const state = vi.hoisted(() => ({ db: undefined as FakeDb | undefined }));
vi.mock("./cloud", () => ({ supabase: () => state.db }));
import { checkFractionPercentMatchCloudCapability, syncOwnedMatchRecord } from "./fraction-percent-match-cloud";

const record = { id: "record", userId: "fish" as const, ownerAccountId: "fish-id", startedAt: 1, completedAt: 2, totalTimeMs: 1, relationCount: 32 as const, relationSetVersion: "1.0.0", gameVersion: "1.0.0" };
const table = (error?: unknown) => ({ select: () => ({ limit: async () => ({ error }) }) });
describe("match cloud capability and ownership", () => {
  beforeEach(() => { state.db = undefined; });
  it("distinguishes unconfigured, base table missing, RPC missing, ready, and request failure", async () => {
    await expect(checkFractionPercentMatchCloudCapability()).resolves.toBe("not_configured");
    state.db = { rpc: async () => ({ error: { message: "missing" } }), from: () => table({ message: "missing table" }) };
    await expect(checkFractionPercentMatchCloudCapability()).resolves.toBe("base_not_deployed");
    state.db = { rpc: async () => ({ error: { message: "missing rpc" } }), from: () => table() };
    await expect(checkFractionPercentMatchCloudCapability()).resolves.toBe("base_rpc_not_deployed");
    state.db = { rpc: async () => ({ data: { history_available: true }, error: null }), from: () => table() };
    await expect(checkFractionPercentMatchCloudCapability()).resolves.toBe("ready");
    state.db = { rpc: async () => ({ data: { history_available: false }, error: null }), from: () => table() };
    await expect(checkFractionPercentMatchCloudCapability()).resolves.toBe("base_not_deployed");
  });
  it("refuses another owner's record before any cloud request and preserves its owner", async () => {
    state.db = { rpc: vi.fn(), from: vi.fn() };
    const result = await syncOwnedMatchRecord(record, "cat-id");
    expect(result).toEqual({ ok: false, reason: "ownership" });
    expect(state.db?.rpc).not.toHaveBeenCalled();
    expect(record.ownerAccountId).toBe("fish-id");
  });
});
