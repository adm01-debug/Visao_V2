/**
 * Tree Data Structure Utilities
 */

export interface TreeNode<T = unknown> {
  id: string;
  data: T;
  children?: TreeNode<T>[];
  parentId?: string | null;
}

export const createNode = <T>(id: string, data: T, children: TreeNode<T>[] = []): TreeNode<T> => ({
  id, data, children,
});

export const findNode = <T>(tree: TreeNode<T>[], id: string): TreeNode<T> | null => {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const findParent = <T>(tree: TreeNode<T>[], id: string): TreeNode<T> | null => {
  for (const node of tree) {
    if (node.children?.some(c => c.id === id)) return node;
    if (node.children?.length) {
      const found = findParent(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const getPath = <T>(tree: TreeNode<T>[], id: string, path: TreeNode<T>[] = []): TreeNode<T>[] => {
  for (const node of tree) {
    const newPath = [...path, node];
    if (node.id === id) return newPath;
    if (node.children?.length) {
      const found = getPath(node.children, id, newPath);
      if (found.length) return found;
    }
  }
  return [];
};

export const getDepth = <T>(tree: TreeNode<T>[], id: string): number =>
  getPath(tree, id).length - 1;

export const getAllNodes = <T>(tree: TreeNode<T>[]): TreeNode<T>[] => {
  const nodes: TreeNode<T>[] = [];
  const traverse = (items: TreeNode<T>[]) => {
    for (const node of items) {
      nodes.push(node);
      if (node.children?.length) traverse(node.children);
    }
  };
  traverse(tree);
  return nodes;
};

export const getLeaves = <T>(tree: TreeNode<T>[]): TreeNode<T>[] =>
  getAllNodes(tree).filter(n => !n.children?.length);

export const mapTree = <T, U>(tree: TreeNode<T>[], fn: (node: TreeNode<T>) => U): TreeNode<U>[] =>
  tree.map(node => ({
    id: node.id,
    data: fn(node),
    children: node.children?.length ? mapTree(node.children, fn) : undefined,
  }));

export const filterTree = <T>(tree: TreeNode<T>[], predicate: (node: TreeNode<T>) => boolean): TreeNode<T>[] =>
  tree.filter(predicate).map(node => ({
    ...node,
    children: node.children?.length ? filterTree(node.children, predicate) : undefined,
  }));

export const flattenTree = <T>(tree: TreeNode<T>[]): Array<T & { id: string; parentId?: string | null }> => {
  const result: Array<T & { id: string; parentId?: string | null }> = [];
  const traverse = (nodes: TreeNode<T>[], parentId: string | null = null) => {
    for (const node of nodes) {
      result.push({ ...node.data, id: node.id, parentId });
      if (node.children?.length) traverse(node.children, node.id);
    }
  };
  traverse(tree);
  return result;
};

export const buildTree = <T extends { id: string; parentId?: string | null }>(items: T[]): TreeNode<T>[] => {
  const map = new Map<string, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];

  items.forEach(item => {
    map.set(item.id, { id: item.id, data: item, children: [] });
  });

  items.forEach(item => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

export const sortTree = <T>(tree: TreeNode<T>[], compareFn: (a: TreeNode<T>, b: TreeNode<T>) => number): TreeNode<T>[] =>
  [...tree].sort(compareFn).map(node => ({
    ...node,
    children: node.children?.length ? sortTree(node.children, compareFn) : undefined,
  }));

export const countNodes = <T>(tree: TreeNode<T>[]): number =>
  getAllNodes(tree).length;

export const getMaxDepth = <T>(tree: TreeNode<T>[], depth = 0): number => {
  if (!tree.length) return depth;
  return Math.max(...tree.map(node => 
    node.children?.length ? getMaxDepth(node.children, depth + 1) : depth + 1
  ));
};
