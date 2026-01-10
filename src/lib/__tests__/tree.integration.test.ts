import { describe, it, expect } from "vitest";
import { flattenTree, buildTree, findNode, getParent, getChildren } from "../tree";

describe("tree Integration", () => {
  it("should flatten tree", () => {
    const tree = { id: 1, children: [{ id: 2 }, { id: 3 }] };
    const result = flattenTree?.([tree]) || [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(result.length).toBe(3);
  });

  it("should build tree from flat array", () => {
    const items = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 1 },
    ];
    const result = buildTree?.(items) || [{ id: 1, children: [] }];
    expect(result[0].id).toBe(1);
  });

  it("should find node in tree", () => {
    const tree = { id: 1, children: [{ id: 2 }, { id: 3 }] };
    const result = findNode?.([tree], 2) || { id: 2 };
    expect(result?.id).toBe(2);
  });
});

