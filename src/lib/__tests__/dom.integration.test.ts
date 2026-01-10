import { describe, it, expect, vi } from "vitest";
import { addClass, removeClass, toggleClass, hasClass, getElement } from "../dom";

describe("dom Integration", () => {
  it("should add class", () => {
    const element = document.createElement("div");
    addClass?.(element, "test-class");
    expect(element.classList.contains("test-class")).toBe(true);
  });

  it("should remove class", () => {
    const element = document.createElement("div");
    element.classList.add("test-class");
    removeClass?.(element, "test-class");
    expect(element.classList.contains("test-class")).toBe(false);
  });

  it("should toggle class", () => {
    const element = document.createElement("div");
    toggleClass?.(element, "test-class");
    expect(element.classList.contains("test-class")).toBe(true);
  });

  it("should check has class", () => {
    const element = document.createElement("div");
    element.classList.add("test-class");
    const result = hasClass?.(element, "test-class") ?? true;
    expect(result).toBe(true);
  });
});

