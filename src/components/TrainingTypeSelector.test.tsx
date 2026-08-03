import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrainingTypeSelector } from "./TrainingTypeSelector";
import { QuestionType, Subtype } from "@/lib/types";

afterEach(cleanup);

function StatefulSelector() {
  const [type, setType] = useState<QuestionType>("two_digit_add_subtract");
  const [subtype, setSubtype] = useState<Subtype>("standard");
  return (
    <TrainingTypeSelector
      onDivisionRuleChange={setSubtype}
      onSelect={(nextType, nextSubtype) => {
        setType(nextType);
        setSubtype(nextSubtype);
      }}
      subtype={subtype}
      type={type}
    />
  );
}

describe("TrainingTypeSelector", () => {
  it("shows ten independent primary entries and maps both fraction directions", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <TrainingTypeSelector
        onDivisionRuleChange={vi.fn()}
        onSelect={onSelect}
        subtype="standard"
        type="two_digit_add_subtract"
      />,
    );

    expect(
      container.querySelectorAll(".trainingTypeGrid > button"),
    ).toHaveLength(10);
    expect(screen.queryByRole("button", { name: "分数—百分数" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "分数转百分数" }));
    expect(onSelect).toHaveBeenLastCalledWith(
      "fraction_percent_conversion",
      "fraction_to_percent",
    );
    fireEvent.click(screen.getByRole("button", { name: "百分数转分数" }));
    expect(onSelect).toHaveBeenLastCalledWith(
      "fraction_percent_conversion",
      "percent_to_fraction",
    );
  });

  it("shows compact division rules only while their parent type is selected", () => {
    render(<StatefulSelector />);

    expect(screen.queryByLabelText("三位数除两位数答题要求")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "三位数÷两位数" }));

    const rulePanel = screen.getByLabelText("三位数除两位数答题要求");
    expect(rulePanel.className).toContain("divisionRulePanel");
    expect(screen.getByRole("button", { name: "商首位" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "商前两位" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "3%估算" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "3%估算" }));
    expect(
      screen
        .getByRole("button", { name: "3%估算" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "两位数加减" }));
    expect(screen.queryByLabelText("三位数除两位数答题要求")).toBeNull();
  });
});
