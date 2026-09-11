import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SkillInsights } from "./SkillInsights";

afterEach(cleanup);

describe("SkillInsights current boundary", () => {
  it("renders both users without inventing mastery or C path diagnostics", () => {
    render(<SkillInsights sessions={[]} />);
    expect(screen.getByText("🐟 小鱼")).toBeTruthy();
    expect(screen.getByText("🐱 小猫")).toBeTruthy();
    expect(screen.getAllByText(/暂无可判断的A层专项数据/)).toHaveLength(2);
    expect(screen.queryByText(/同题路径对比/)).toBeNull();
  });
});
