import { describe, it, expect } from "vitest";
import { diffObjects, diffObjectsDetailed, diffArrays, diffArraysBy, diffText, applyDiff, isEqual } from "@/utils/diff";

describe("diff utils", () => {
  describe("diffObjects", () => {
    it("finds changed keys", () => {
      expect(diffObjects({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ b: 3 });
    });
    it("finds added keys", () => {
      expect(diffObjects({ a: 1 }, { a: 1, b: 2 } as any)).toEqual({ b: 2 });
    });
    it("finds removed keys (undefined in new)", () => {
      const result = diffObjects({ a: 1, b: 2 }, { a: 1 } as any);
      expect(result).toHaveProperty("b");
    });
    it("returns empty for identical", () => {
      expect(diffObjects({ a: 1 }, { a: 1 })).toEqual({});
    });
    it("handles nested objects", () => {
      expect(diffObjects({ a: { x: 1 } }, { a: { x: 2 } })).toEqual({ a: { x: 2 } });
    });
    it("handles arrays in objects", () => {
      expect(diffObjects({ a: [1, 2] }, { a: [1, 3] })).toEqual({ a: [1, 3] });
    });
  });

  describe("diffObjectsDetailed", () => {
    it("classifies added", () => {
      const entries = diffObjectsDetailed({} as any, { a: 1 } as any);
      expect(entries).toEqual([{ key: "a", oldValue: undefined, newValue: 1, type: "added" }]);
    });
    it("classifies removed", () => {
      const entries = diffObjectsDetailed({ a: 1 } as any, {} as any);
      expect(entries).toEqual([{ key: "a", oldValue: 1, newValue: undefined, type: "removed" }]);
    });
    it("classifies changed", () => {
      const entries = diffObjectsDetailed({ a: 1 }, { a: 2 });
      expect(entries[0].type).toBe("changed");
    });
    it("excludes unchanged", () => {
      const entries = diffObjectsDetailed({ a: 1 }, { a: 1 });
      expect(entries).toEqual([]);
    });
  });

  describe("diffArrays", () => {
    it("finds added/removed/unchanged", () => {
      const result = diffArrays([1, 2, 3], [2, 3, 4]);
      expect(result.added).toEqual([4]);
      expect(result.removed).toEqual([1]);
      expect(result.unchanged).toEqual([2, 3]);
    });
    it("handles empty arrays", () => {
      expect(diffArrays([], [1, 2])).toEqual({ added: [1, 2], removed: [], unchanged: [] });
      expect(diffArrays([1, 2], [])).toEqual({ added: [], removed: [1, 2], unchanged: [] });
    });
    it("handles identical arrays", () => {
      expect(diffArrays([1, 2], [1, 2])).toEqual({ added: [], removed: [], unchanged: [1, 2] });
    });
    it("handles strings", () => {
      const result = diffArrays(["a", "b"], ["b", "c"]);
      expect(result.added).toEqual(["c"]);
      expect(result.removed).toEqual(["a"]);
    });
  });

  describe("diffArraysBy", () => {
    it("diffs by key function", () => {
      const a = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
      const b = [{ id: 2, name: "B2" }, { id: 3, name: "C" }];
      const result = diffArraysBy(a, b, x => x.id);
      expect(result.added).toEqual([{ id: 3, name: "C" }]);
      expect(result.removed).toEqual([{ id: 1, name: "A" }]);
      expect(result.unchanged.map(x => x.id)).toEqual([2]);
    });
  });

  describe("diffText", () => {
    it("identifies equal lines", () => {
      const result = diffText("line1\nline2", "line1\nline2");
      expect(result.every(e => e.type === "equal")).toBe(true);
    });
    it("identifies added lines", () => {
      const result = diffText("line1", "line1\nline2");
      expect(result.some(e => e.type === "add" && e.value === "line2")).toBe(true);
    });
    it("identifies removed lines", () => {
      const result = diffText("line1\nline2", "line1");
      expect(result.some(e => e.type === "remove" && e.value === "line2")).toBe(true);
    });
    it("identifies changed lines", () => {
      const result = diffText("old", "new");
      expect(result).toEqual([
        { type: "remove", value: "old", lineNumber: 1 },
        { type: "add", value: "new", lineNumber: 1 },
      ]);
    });
    it("handles empty strings", () => {
      expect(diffText("", "")).toEqual([{ type: "equal", value: "", lineNumber: 1 }]);
    });
  });

  describe("applyDiff", () => {
    it("applies diff to object", () => {
      expect(applyDiff({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
    });
    it("adds new keys", () => {
      expect(applyDiff({ a: 1 }, { b: 2 } as any)).toEqual({ a: 1, b: 2 });
    });
  });

  describe("isEqual", () => {
    it("compares primitives", () => {
      expect(isEqual(1, 1)).toBe(true);
      expect(isEqual(1, 2)).toBe(false);
      expect(isEqual("a", "a")).toBe(true);
    });
    it("compares objects", () => {
      expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    });
    it("compares arrays", () => {
      expect(isEqual([1, 2], [1, 2])).toBe(true);
      expect(isEqual([1], [1, 2])).toBe(false);
    });
    it("compares nested", () => {
      expect(isEqual({ a: { b: [1] } }, { a: { b: [1] } })).toBe(true);
    });
  });
});
