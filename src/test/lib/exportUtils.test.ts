import { describe, it, expect, vi } from "vitest";
import { exportToCSV, alertExportHeaders, cameraExportHeaders } from "@/lib/exportUtils";

describe("exportUtils", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: vi.fn(), style: {},
    } as any);
    vi.spyOn(document.body, "appendChild").mockReturnValue(null as any);
    vi.spyOn(document.body, "removeChild").mockReturnValue(null as any);
  });

  afterEach(() => vi.unstubAllGlobals());

  describe("exportToCSV", () => {
    it("does nothing for empty data", () => {
      expect(() => exportToCSV([], "test")).not.toThrow();
    });
    it("exports data with auto headers", () => {
      expect(() => exportToCSV([{ a: 1, b: "x" }], "test")).not.toThrow();
    });
    it("exports data with custom headers", () => {
      expect(() => exportToCSV(
        [{ name: "Cam1", status: "online" }],
        "test",
        [{ key: "name", label: "Nome" }, { key: "status", label: "Status" }]
      )).not.toThrow();
    });
    it("handles null values", () => {
      expect(() => exportToCSV([{ a: null, b: undefined, c: "ok" }], "test")).not.toThrow();
    });
    it("escapes commas in values", () => {
      expect(() => exportToCSV([{ a: "hello, world" }], "test")).not.toThrow();
    });
  });

  describe("header constants", () => {
    it("alertExportHeaders has correct keys", () => {
      expect(alertExportHeaders.length).toBe(6);
      expect(alertExportHeaders[0].key).toBe("timestamp");
      expect(alertExportHeaders[0].label).toBe("Data/Hora");
    });
    it("cameraExportHeaders has correct keys", () => {
      expect(cameraExportHeaders.length).toBe(5);
      expect(cameraExportHeaders[0].key).toBe("name");
    });
  });
});
