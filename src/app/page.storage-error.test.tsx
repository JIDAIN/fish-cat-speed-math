import "fake-indexeddb/auto";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

describe("Home storage error state", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a clear in-app error when IndexedDB cannot be read", async () => {
    vi.stubGlobal("indexedDB", {
      open() {
        throw new DOMException("IndexedDB is unavailable", "InvalidStateError");
      },
    } as unknown as IDBFactory);

    render(<Home />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "本地训练记录读取失败",
    );
  });
});
