import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountPanel } from "./AccountPanel";

vi.mock("@/lib/cloud", () => ({
  supabase: () => ({}),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

describe("AccountPanel", () => {
  afterEach(cleanup);

  it("does not show the unauthenticated form while auth is still resolving", () => {
    render(<AccountPanel authResolved={false} onIdentity={vi.fn()} />);

    expect(screen.getByText("正在确认账号状态…")).toBeTruthy();
    expect(screen.queryByLabelText("登录邮箱")).toBeNull();
  });

  it("keeps the confirmed unauthenticated state compact until login is requested", async () => {
    const user = userEvent.setup();
    render(<AccountPanel authResolved onIdentity={vi.fn()} />);

    expect(screen.getByText("未登录，仅本地保存")).toBeTruthy();
    expect(screen.queryByLabelText("登录邮箱")).toBeNull();

    await user.click(screen.getByRole("button", { name: "登录同步账号" }));
    expect(screen.getByLabelText("登录邮箱")).toBeTruthy();
    expect(screen.getByLabelText("登录密码")).toBeTruthy();
  });

  it("shows the bound role instead of account switching controls once signed in", () => {
    render(
      <AccountPanel
        authResolved
        identity={{ id: "cat-id", email: "cat@example.com", role: "cat" }}
        onIdentity={vi.fn()}
      />,
    );

    expect(screen.getByText(/小猫/)).toBeTruthy();
    expect(screen.getByText("cat@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "退出" })).toBeTruthy();
    expect(screen.queryByText("登录同步账号")).toBeNull();
  });
});
