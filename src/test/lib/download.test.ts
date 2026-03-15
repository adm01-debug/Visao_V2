import { describe, it, expect, vi } from "vitest";
import { download, downloadBlob, downloadText, downloadJSON } from "@/lib/download";

describe("download", () => {
  it("creates and clicks a link", () => {
    const clickSpy = vi.fn();
    const createSpy = vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: clickSpy, style: {},
    } as any);
    vi.spyOn(document.body, "appendChild").mockReturnValue(null as any);
    vi.spyOn(document.body, "removeChild").mockReturnValue(null as any);

    download("http://test.com/file.pdf", "file.pdf");
    expect(clickSpy).toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it("downloadBlob creates object URL", () => {
    const revokeURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: revokeURL });
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: vi.fn(), style: {},
    } as any);
    vi.spyOn(document.body, "appendChild").mockReturnValue(null as any);
    vi.spyOn(document.body, "removeChild").mockReturnValue(null as any);

    const blob = new Blob(["test"], { type: "text/plain" });
    downloadBlob(blob, "test.txt");
    expect(revokeURL).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("downloadText creates text blob", () => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: vi.fn(), style: {},
    } as any);
    vi.spyOn(document.body, "appendChild").mockReturnValue(null as any);
    vi.spyOn(document.body, "removeChild").mockReturnValue(null as any);

    expect(() => downloadText("hello world", "test.txt")).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("downloadJSON serializes data", () => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: vi.fn(), style: {},
    } as any);
    vi.spyOn(document.body, "appendChild").mockReturnValue(null as any);
    vi.spyOn(document.body, "removeChild").mockReturnValue(null as any);

    expect(() => downloadJSON({ key: "value" }, "data.json")).not.toThrow();
    vi.unstubAllGlobals();
  });
});
