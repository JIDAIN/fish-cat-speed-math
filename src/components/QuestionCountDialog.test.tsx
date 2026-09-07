import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionCountDialog } from "./QuestionCountDialog";

describe("QuestionCountDialog", () => {
  afterEach(cleanup);

  it("offers only quick and standard counts for new training", () => {
    const onConfirm = vi.fn();
    render(
      <QuestionCountDialog
        initialCount={20}
        lastCustomCount={70}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByText(/自定义模式/)).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /快速模式/ }));
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onConfirm).toHaveBeenLastCalledWith({ count: 10, mode: "quick" });

    fireEvent.click(screen.getByRole("button", { name: /标准模式/ }));
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onConfirm).toHaveBeenLastCalledWith({ count: 20, mode: "standard" });
  });

  it("normalizes a historical custom initial count to the 20-question option", () => {
    const onConfirm = vi.fn();
    render(
      <QuestionCountDialog
        initialCount={70}
        lastCustomCount={70}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onConfirm).toHaveBeenCalledWith({ count: 20, mode: "standard" });
    expect(screen.getByText(/历史30～100题记录仍可正常查看和恢复/)).toBeTruthy();
  });

  it("routes close and cancel through the cancel callback", () => {
    const onCancel = vi.fn();
    render(
      <QuestionCountDialog
        initialCount={20}
        lastCustomCount={30}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "关闭题量选择" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
