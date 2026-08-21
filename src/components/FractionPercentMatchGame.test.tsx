import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FractionPercentMatchGame } from "./FractionPercentMatchGame";

describe("FractionPercentMatchGame", () => {
  afterEach(cleanup);
  it("keeps a fixed 4x4 board and supports matching, switching and mismatch feedback", () => {
    render(
      <FractionPercentMatchGame
        userId="fish"
        onComplete={vi.fn()}
        onHistory={vi.fn()}
        onHome={vi.fn()}
      />,
    );
    const board = screen.getByLabelText("4乘4配对棋盘");
    const before = [...board.querySelectorAll("button")].map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(before).toHaveLength(16);
    const fractions = [...board.querySelectorAll("button")].filter(
      (button) =>
        button.textContent?.includes("/") === false &&
        button.getAttribute("aria-label")?.includes("/") &&
        !button.getAttribute("aria-label")?.includes("%"),
    );
    fireEvent.click(fractions[0]);
    fireEvent.click(fractions[1]);
    expect(fractions[1].getAttribute("aria-pressed")).toBe("true");
    const labels = new Set(before);
    const knownPair =
      labels.has("1/7") && labels.has("14.3%")
        ? ["1/7", "14.3%"]
        : ["1/4", "25%"];
    const fraction = board.querySelector(`[aria-label="${knownPair[0]}"]`);
    const percent = board.querySelector(`[aria-label="${knownPair[1]}"]`);
    if (fraction && percent) {
      fireEvent.click(fraction);
      fireEvent.click(percent);
    }
    expect(
      [...board.querySelectorAll("button")].map((button) =>
        button.getAttribute("aria-label"),
      ),
    ).toEqual(before);
  });
});
