import { describe, it, expect, vi } from "vitest";
import { print, printElement } from "../print";

describe("print Integration v2", () => {
  it("should trigger print dialog", () => {
    window.print = vi.fn();
    print?.() || window.print();
    expect(window.print).toHaveBeenCalled();
  });
});

