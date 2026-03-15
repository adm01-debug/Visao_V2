import { describe, it, expect } from "vitest";
import {
  createNode, findNode, findParent, getPath, getDepth,
  getAllNodes, getLeaves, mapTree, filterTree, flattenTree,
  buildTree, sortTree, countNodes, getMaxDepth,
} from "@/utils/tree";

const sampleTree = () => [
  createNode("1", "root", [
    createNode("1.1", "child1", [
      createNode("1.1.1", "grandchild1"),
      createNode("1.1.2", "grandchild2"),
    ]),
    createNode("1.2", "child2"),
  ]),
  createNode("2", "root2"),
];

describe("tree utils", () => {
  describe("createNode", () => {
    it("creates node with defaults", () => {
      const n = createNode("a", "data");
      expect(n).toEqual({ id: "a", data: "data", children: [] });
    });
  });

  describe("findNode", () => {
    it("finds root", () => expect(findNode(sampleTree(), "1")?.data).toBe("root"));
    it("finds nested", () => expect(findNode(sampleTree(), "1.1.2")?.data).toBe("grandchild2"));
    it("returns null for missing", () => expect(findNode(sampleTree(), "nope")).toBeNull());
  });

  describe("findParent", () => {
    it("finds parent of nested node", () => expect(findParent(sampleTree(), "1.1.1")?.id).toBe("1.1"));
    it("finds parent of child", () => expect(findParent(sampleTree(), "1.1")?.id).toBe("1"));
    it("returns null for root", () => expect(findParent(sampleTree(), "1")).toBeNull());
  });

  describe("getPath", () => {
    it("returns path to node", () => {
      const path = getPath(sampleTree(), "1.1.2");
      expect(path.map(n => n.id)).toEqual(["1", "1.1", "1.1.2"]);
    });
    it("returns empty for missing", () => expect(getPath(sampleTree(), "nope")).toEqual([]));
  });

  describe("getDepth", () => {
    it("root = 0", () => expect(getDepth(sampleTree(), "1")).toBe(0));
    it("child = 1", () => expect(getDepth(sampleTree(), "1.1")).toBe(1));
    it("grandchild = 2", () => expect(getDepth(sampleTree(), "1.1.1")).toBe(2));
  });

  describe("getAllNodes", () => {
    it("returns all nodes", () => {
      expect(getAllNodes(sampleTree())).toHaveLength(6);
    });
  });

  describe("getLeaves", () => {
    it("returns leaf nodes only", () => {
      const leaves = getLeaves(sampleTree());
      expect(leaves.map(n => n.id).sort()).toEqual(["1.1.1", "1.1.2", "1.2", "2"]);
    });
  });

  describe("mapTree", () => {
    it("maps data", () => {
      const mapped = mapTree(sampleTree(), n => (n.data as string).toUpperCase());
      expect(mapped[0].data).toBe("ROOT");
      expect(mapped[0].children![0].data).toBe("CHILD1");
    });
  });

  describe("filterTree", () => {
    it("filters nodes", () => {
      const filtered = filterTree(sampleTree(), n => n.id !== "1.2");
      expect(findNode(filtered, "1.2")).toBeNull();
    });
  });

  describe("flattenTree", () => {
    it("flattens with parentId", () => {
      const flat = flattenTree(sampleTree());
      expect(flat).toHaveLength(6);
      const grandchild = flat.find(n => n.id === "1.1.1");
      expect(grandchild?.parentId).toBe("1.1");
    });
    it("root has null parentId", () => {
      const flat = flattenTree(sampleTree());
      expect(flat.find(n => n.id === "1")?.parentId).toBeNull();
    });
  });

  describe("buildTree", () => {
    it("builds from flat array", () => {
      const items = [
        { id: "a", parentId: null },
        { id: "b", parentId: "a" },
        { id: "c", parentId: "a" },
        { id: "d", parentId: "b" },
      ];
      const tree = buildTree(items);
      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children![0].children).toHaveLength(1);
    });
    it("handles orphans as roots", () => {
      const items = [{ id: "a", parentId: "nonexistent" }];
      const tree = buildTree(items);
      expect(tree).toHaveLength(1);
    });
  });

  describe("sortTree", () => {
    it("sorts nodes", () => {
      const tree = [createNode("b", 2), createNode("a", 1)];
      const sorted = sortTree(tree, (a, b) => a.id.localeCompare(b.id));
      expect(sorted[0].id).toBe("a");
    });
  });

  describe("countNodes", () => {
    it("counts all nodes", () => expect(countNodes(sampleTree())).toBe(6));
    it("counts empty tree", () => expect(countNodes([])).toBe(0));
  });

  describe("getMaxDepth", () => {
    it("returns max depth", () => expect(getMaxDepth(sampleTree())).toBe(3));
    it("returns 0 for empty", () => expect(getMaxDepth([])).toBe(0));
  });
});
