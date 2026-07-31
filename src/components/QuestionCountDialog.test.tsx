import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionCountDialog } from "./QuestionCountDialog";

describe("QuestionCountDialog", () => {
  afterEach(cleanup);

  it("selects quick, standard and custom counts only after confirmation", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <QuestionCountDialog
        initialCount={20}
        lastCustomCount={30}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /快速模式/ }));
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onConfirm).toHaveBeenLastCalledWith({ count: 10, mode: "quick" });

    fireEvent.click(screen.getByRole("button", { name: /标准模式/ }));
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onConfirm).toHaveBeenLastCalledWith({ count: 20, mode: "standard" });

    fireEvent.click(screen.getByRole("button", { name: /自定义模式/ }));
    const range = screen.getByRole("slider", { name: "自定义题量" });
    fireEvent.change(range, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onConfirm).toHaveBeenLastCalledWith({ count: 30, mode: "custom" });
  });

  it("keeps the supplied custom value and allows a one-hundred question choice", () => {
    const onConfirm = vi.fn();
    render(
      <QuestionCountDialog
        initialCount={70}
        lastCustomCount={70}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("70题")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: "自定义题量" }), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onConfirm).toHaveBeenCalledWith({ count: 100, mode: "custom" });
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
