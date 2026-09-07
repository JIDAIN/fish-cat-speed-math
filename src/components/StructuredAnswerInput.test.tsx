import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PERCENT_BLOCKS,
  StructuredAnswerInput,
} from "./StructuredAnswerInput";

afterEach(cleanup);

describe("StructuredAnswerInput", () => {
  it("supports numeric input without parsing free-form expressions", () => {
    const onChange = vi.fn();
    render(
      <StructuredAnswerInput kind="number" onChange={onChange} value="" />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "答案" }), {
      target: { value: "12.5" },
    });
    expect(onChange).toHaveBeenCalledWith("12.5");
  });

  it("uses the frozen percentage-block set for split training", () => {
    expect(DEFAULT_PERCENT_BLOCKS.map((item) => item.value)).toEqual([
      "100",
      "50",
      "25",
      "20",
      "10",
      "5",
      "2",
      "1",
      "0.1",
    ]);
    const onChange = vi.fn();
    render(
      <StructuredAnswerInput
        kind="percent_blocks"
        onChange={onChange}
        value="50,20"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "10%" }));
    expect(onChange).toHaveBeenCalledWith("50,20,10");
  });
});
