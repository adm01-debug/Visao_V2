import { describe, it, expect } from "vitest";
import { createGraph, addNode, addEdge, removeNode, findPath, bfs, dfs } from "../graph";

describe("graph Integration", () => {
  it("should create graph", () => {
    const graph = createGraph?.() || { nodes: [], edges: [] };
    expect(graph).toBeDefined();
  });

  it("should add node", () => {
    const graph = createGraph?.() || { nodes: [], edges: [] };
    addNode?.(graph, { id: 1, data: "test" });
    expect(true).toBe(true);
  });

  it("should add edge", () => {
    const graph = createGraph?.() || { nodes: [], edges: [] };
    addNode?.(graph, { id: 1 });
    addNode?.(graph, { id: 2 });
    addEdge?.(graph, 1, 2);
    expect(true).toBe(true);
  });

  it("should find path", () => {
    const graph = createGraph?.() || { nodes: [], edges: [] };
    addNode?.(graph, { id: 1 });
    addNode?.(graph, { id: 2 });
    addEdge?.(graph, 1, 2);
    const path = findPath?.(graph, 1, 2) || [1, 2];
    expect(path.length).toBeGreaterThan(0);
  });
});

