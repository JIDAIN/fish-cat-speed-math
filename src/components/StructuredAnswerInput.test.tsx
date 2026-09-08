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

  it("renders semantic choice and sequence alternatives directly", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <StructuredAnswerInput
        choices={[
          { value: "2,1", label: "先减13，再减487" },
          { value: "1,2", label: "先减487，再减13" },
        ]}
        kind="sequence"
        onChange={onChange}
        onCommit={onCommit}
        value=""
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "先减13，再减487" }));
    expect(onChange).toHaveBeenCalledWith("2,1");
    expect(onCommit).toHaveBeenCalledWith("2,1");
  });

  it("uses every frozen percentage block required by current split generators", () => {
    expect(DEFAULT_PERCENT_BLOCKS.map((item) => item.value)).toEqual([
      "100",
      "50",
      "25",
      "20",
      "12.5",
      "10",
      "5",
      "3",
      "2.5",
      "2",
      "1",
      "0.1",
    ]);
    const onChange = vi.fn();
    render(
      <StructuredAnswerInput
        kind="percent_blocks"
        onChange={onChange}
        value="12.5,2.5"
      />,
    );
    expect(screen.getByLabelText("答案已选组合").textContent).toBe(
      "12.5% + 2.5%",
    );
    fireEvent.click(screen.getByRole("button", { name: "3%" }));
    expect(onChange).toHaveBeenCalledWith("12.5,2.5,3");
  });
});
