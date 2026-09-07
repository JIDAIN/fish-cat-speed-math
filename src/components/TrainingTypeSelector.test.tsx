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
  it("shows A/B/C skill groups plus the existing primary entries and maps both fraction directions", () => {
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
    ).toHaveLength(34);
    expect(screen.getByRole("button", { name: /B·求 r/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /B·运算顺序/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /B·分数拆百分数/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /B·计算转换/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /C·直除步骤/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /C·误差 \/ 精度/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /C·除法拆分/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /C·加减乘补偿放缩/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /C·除法补偿放缩/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /C·纯数值比较/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "分数—百分数" })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "两位数×两位数" }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "两位数×两位数" }));
    expect(onSelect).toHaveBeenLastCalledWith(
      "two_by_two_multiply",
      "standard",
    );

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

  it("selects A, B and C skills and preserves difficulty in the encoded subtype", () => {
    render(<StatefulSelector />);

    fireEvent.click(screen.getByRole("button", { name: "逆向乘法口诀" }));
    expect(
      screen
        .getByRole("button", { name: "逆向乘法口诀" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "L2" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /B·求 r/ }));
    fireEvent.click(screen.getByRole("button", { name: "差值÷基准" }));
    expect(
      screen
        .getByRole("button", { name: "差值÷基准" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "L3" }));
    expect(
      screen.getByRole("button", { name: "L3" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /B·运算顺序/ }));
    fireEvent.click(screen.getByRole("button", { name: "最低操作成本顺序" }));
    expect(
      screen
        .getByRole("button", { name: "最低操作成本顺序" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /B·分数拆百分数/ }));
    fireEvent.click(screen.getByRole("button", { name: "最低成本拆分路径" }));
    expect(
      screen
        .getByRole("button", { name: "最低成本拆分路径" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /C·除法拆分/ }));
    fireEvent.click(screen.getByRole("button", { name: "完整拆分流程" }));
    expect(
      screen
        .getByRole("button", { name: "完整拆分流程" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /C·加减乘补偿放缩/ }));
    fireEvent.click(screen.getByRole("button", { name: "乘法反向补偿" }));
    expect(
      screen
        .getByRole("button", { name: "乘法反向补偿" })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /C·除法补偿放缩/ }));
    fireEvent.click(screen.getByRole("button", { name: "结果端r" }));
    expect(
      screen
        .getByRole("button", { name: "结果端r" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
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

  it("shows the two two-digit multiplication modes under one primary entry", () => {
    render(<StatefulSelector />);

    expect(screen.queryByLabelText("两位数乘两位数训练模式")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "两位数×两位数" }));

    expect(screen.getByLabelText("两位数乘两位数训练模式")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "综合训练" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "进位强化" }));
    expect(
      screen
        .getByRole("button", { name: "进位强化" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
