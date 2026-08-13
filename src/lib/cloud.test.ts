import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: query }),
}));

describe("readOwnCompletedTrainingForExport", () => {
  beforeEach(() => {
    vi.resetModules();
    query.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
  });
  it("filters owner and reads all pages", async () => {
    const calls: unknown[] = [];
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn((from: number) => {
        calls.push(from);
        return Promise.resolve({
          data: from
            ? []
            : Array.from({ length: 200 }, (_, i) => ({
                session_id: String(i),
              })),
          error: null,
        });
      }),
    };
    query.mockReturnValue(chain);
    const { readOwnCompletedTrainingForExport } = await import("./cloud");
    const rows = await readOwnCompletedTrainingForExport("mine");
    expect(rows).toHaveLength(200);
    expect(chain.eq).toHaveBeenCalledWith("owner_id", "mine");
    expect(calls).toEqual([0, 200]);
  });
  it("fails atomically when a later page fails", async () => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn((from: number) =>
        Promise.resolve(
          from
            ? { data: null, error: new Error("page failed") }
            : { data: Array.from({ length: 200 }, () => ({})), error: null },
        ),
      ),
    };
    query.mockReturnValue(chain);
    const { readOwnCompletedTrainingForExport } = await import("./cloud");
    await expect(readOwnCompletedTrainingForExport("mine")).rejects.toThrow(
      "page failed",
    );
  });

  it("retries every page without the new database column before its migration", async () => {
    const selected: string[] = [];
    const chain = {
      select: vi.fn((columns: string) => {
        selected.push(columns);
        return chain;
      }),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn(() =>
        Promise.resolve(
          selected.at(-1)?.includes("real_completed_at")
            ? {
                data: null,
                error: { message: 'column "real_completed_at" does not exist' },
              }
            : { data: [], error: null },
        ),
      ),
    };
    query.mockReturnValue(chain);
    const { readOwnCompletedTrainingForExport } = await import("./cloud");
    await expect(readOwnCompletedTrainingForExport("mine")).resolves.toEqual(
      [],
    );
    expect(selected).toHaveLength(2);
    expect(selected[1]).not.toContain("real_completed_at");
  });
});
