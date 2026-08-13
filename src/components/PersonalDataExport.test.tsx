import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { PersonalDataExport } from "./PersonalDataExport";

const read = vi.fn();
const download = vi.fn();
vi.mock("@/lib/cloud", () => ({
  readOwnCompletedTrainingForExport: (...args: unknown[]) => read(...args),
}));
vi.mock("@/lib/data-export", () => ({
  createDataExport: () => ({
    archive: {},
    trainings: [],
    questions: [],
    warnings: [],
  }),
}));
vi.mock("@/lib/data-export-files", () => ({
  createXlsxBlob: () => new Blob(),
  createJsonBlob: () => new Blob(),
  downloadBlob: (...args: unknown[]) => download(...args),
  exportFileBaseName: () => "export",
}));

afterEach(() => {
  cleanup();
  read.mockReset();
  download.mockReset();
});

describe("PersonalDataExport", () => {
  it("requires identity before exporting", () => {
    render(<PersonalDataExport />);
    expect(
      screen
        .getByRole("button", { name: "导出 XLSX 和 JSON" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByText("请先登录已绑定的同步账号。")).toBeTruthy();
  });

  it("downloads both files only after a complete successful read", async () => {
    read.mockResolvedValue([]);
    render(
      <PersonalDataExport
        identity={{ id: "owner", role: "fish", email: "a@test" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "导出 XLSX 和 JSON" }));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(2));
    expect(download.mock.calls.map((call) => call[1])).toEqual([
      "export.xlsx",
      "export.json",
    ]);
  });

  it("does not download either file when reading fails", async () => {
    read.mockRejectedValue(new Error("network down"));
    render(
      <PersonalDataExport
        identity={{ id: "owner", role: "fish", email: "a@test" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "导出 XLSX 和 JSON" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("导出失败"),
    );
    expect(download).not.toHaveBeenCalled();
  });
});
