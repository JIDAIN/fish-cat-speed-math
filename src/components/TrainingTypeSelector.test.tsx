import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrainingTypeSelector } from "./TrainingTypeSelector";
import { skillDrillSelectorSkillIds } from "./SkillDrillSelector";
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

describe("TrainingTypeSelector current product boundary", () => {
  it("shows daily, A specialty and classic training only", () => {
    render(<StatefulSelector />);

    expect(screen.getByRole("button", { name: /日常训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /专项训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /经典训练/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /智能训练/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "两位数加减" })).toBeNull();
  });

  it("exposes exactly the eight canonical A abilities while reserving C category slots", () => {
    expect(skillDrillSelectorSkillIds).toEqual([
      "A-FRA-01",
      "A-ADD-01",
      "A-SUB-01",
      "A-COM-01",
      "A-MUL-01",
      "A-MUL-02",
      "A-MUL-03",
      "A-PCT-01",
    ]);
    expect(new Set(skillDrillSelectorSkillIds).size).toBe(8);

    render(<StatefulSelector />);
    fireEvent.click(screen.getByRole("button", { name: /专项训练/ }));

    expect(
      screen.getByRole("button", { name: /邻近倍数反应/ }).hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByRole("button", { name: /百化分反应/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /加减法/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /乘法/ })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^除法/ }).hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: /分数比较/ }).hasAttribute("disabled"),
    ).toBe(true);

    expect(screen.getByRole("button", { name: "2～3位加法" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2～3位减法" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "近邻小差值" }));
    expect(screen.getByRole("button", { name: /难度：L2/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /百化分反应/ }));
    expect(screen.getByRole("button", { name: "高频分数 ↔ 百分数" })).toBeTruthy();
  });

  it("makes daily training a one-tap canonical A mixed shortcut", () => {
    const onSelect = vi.fn();
    render(
      <TrainingTypeSelector
        onDivisionRuleChange={vi.fn()}
        onSelect={onSelect}
        subtype="standard"
        type="two_digit_add_subtract"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /日常训练/ }));
    expect(onSelect).toHaveBeenLastCalledWith("skill_drill", "mixed:L2");
  });

  it("keeps classic training available without mapping it into A", () => {
    render(<StatefulSelector />);
    fireEvent.click(screen.getByRole("button", { name: /经典训练/ }));
    fireEvent.click(screen.getByRole("button", { name: "三位数÷两位数" }));
    expect(screen.getByLabelText("三位数除两位数答题要求")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "3%估算" }));
    expect(
      screen.getByRole("button", { name: "3%估算" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "两位数×两位数" }));
    expect(screen.getByLabelText("两位数乘两位数训练模式")).toBeTruthy();
  });
});
