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

describe("TrainingTypeSelector mobile information architecture", () => {
  it("shows only four top-level training choices before details are expanded", () => {
    render(<StatefulSelector />);

    expect(screen.getByRole("button", { name: /日常训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /专项训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /智能训练/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /经典训练/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "两位数加减" })).toBeNull();
  });

  it("exposes only the eight canonical A abilities in the specialty selector", () => {
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

    expect(screen.getByRole("button", { name: /邻近倍数反应/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /百化分反应/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /加减法/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /乘法/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^除法/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /分数比较/ })).toBeDisabled();

    expect(screen.getByRole("button", { name: "2～3位加法" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2～3位减法" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "近邻小差值" }));
    expect(
      screen.getByRole("button", { name: /难度：L2/ }).getAttribute("aria-expanded"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /难度：L2/ }));
    const difficultyPanel = screen.getByLabelText("专项难度");
    fireEvent.click(difficultyPanel.querySelectorAll("button")[3]);
    expect(screen.getByRole("button", { name: /难度：L3/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /百化分反应/ }));
    expect(
      screen.getByRole("button", { name: "高频分数 ↔ 百分数" }),
    ).toBeTruthy();
  });

  it("makes daily training a one-tap L2 mixed-training shortcut", () => {
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

  it("keeps smart modes compact and only expands difficulty on demand", () => {
    render(<StatefulSelector />);
    fireEvent.click(screen.getByRole("button", { name: /智能训练/ }));
    fireEvent.click(screen.getByRole("button", { name: /^同题路径对比/ }));
    expect(screen.getByRole("button", { name: /难度：L2/ })).toBeTruthy();
    expect(screen.queryByLabelText("智能训练难度选项")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /难度：L2/ }));
    const options = screen.getByLabelText("智能训练难度选项");
    fireEvent.click(options.querySelectorAll("button")[2]);
    expect(screen.getByRole("button", { name: /难度：L3/ })).toBeTruthy();
  });

  it("keeps legacy comprehensive training behind the classic entry", () => {
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
