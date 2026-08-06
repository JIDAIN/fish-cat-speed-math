import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FractionPercentMemory } from "./FractionPercentMemory";

describe("FractionPercentMemory", () => {
  afterEach(cleanup);

  it("shows all fixed relations in grouped fraction-to-percent form", () => {
    render(<FractionPercentMemory />);

    expect(screen.getByText("单位分数")).toBeTruthy();
    expect(screen.getByText("七分之一系")).toBeTruthy();
    expect(screen.getAllByText("33.3%")).toHaveLength(1);
    expect(screen.getAllByText("43.75%")).toHaveLength(1);
    expect(screen.getAllByLabelText("1/3")).toHaveLength(1);
    expect(screen.getAllByLabelText("7/16")).toHaveLength(1);
  });

  it("switches to the reverse direction without changing the fixed relations", () => {
    render(<FractionPercentMemory />);

    fireEvent.click(screen.getByRole("tab", { name: "百分数 → 分数" }));

    expect(
      screen
        .getByRole("tab", { name: "百分数 → 分数" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getAllByText("33.3%")).toHaveLength(1);
    expect(screen.getAllByLabelText("1/3")).toHaveLength(1);
  });
});
