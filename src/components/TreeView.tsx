/**
 * TreeView Component
 * Visualização hierárquica de dados com suporte a expansão, seleção e drag-and-drop
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react';

export interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: Record<string, unknown>;
  disabled?: boolean;
  isLeaf?: boolean;
}

export interface TreeViewProps {
  data: TreeNode[];
  selectedIds?: string[];
  expandedIds?: string[];
  onSelect?: (node: TreeNode, selected: boolean) => void;
  onExpand?: (node: TreeNode, expanded: boolean) => void;
  onDoubleClick?: (node: TreeNode) => void;
  onContextMenu?: (node: TreeNode, event: React.MouseEvent) => void;
  multiSelect?: boolean;
  showIcons?: boolean;
  showLines?: boolean;
  draggable?: boolean;
  onDragStart?: (node: TreeNode) => void;
  onDragEnd?: (node: TreeNode) => void;
  onDrop?: (dragNode: TreeNode, dropNode: TreeNode, position: 'before' | 'after' | 'inside') => void;
  className?: string;
  nodeClassName?: string;
  renderLabel?: (node: TreeNode) => React.ReactNode;
  filterText?: string;
  virtualized?: boolean;
  defaultExpandAll?: boolean;
  checkable?: boolean;
  checkedIds?: string[];
  onCheck?: (node: TreeNode, checked: boolean) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  isChecked?: boolean;
  onSelect: (node: TreeNode) => void;
  onExpand: (node: TreeNode) => void;
  onCheck?: (node: TreeNode) => void;
  onDoubleClick?: (node: TreeNode) => void;
  onContextMenu?: (node: TreeNode, event: React.MouseEvent) => void;
  showIcons: boolean;
  showLines: boolean;
  checkable: boolean;
  draggable: boolean;
  renderLabel?: (node: TreeNode) => React.ReactNode;
  nodeClassName?: string;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  level,
  isSelected,
  isExpanded,
  isChecked,
  onSelect,
  onExpand,
  onCheck,
  onDoubleClick,
  onContextMenu,
  showIcons,
  showLines,
  checkable,
  draggable,
  renderLabel,
  nodeClassName,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = node.isLeaf || !hasChildren;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.disabled) return;
    onSelect(node);
  }, [node, onSelect]);

  const handleExpandClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onExpand(node);
    }
  }, [node, hasChildren, onExpand]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.disabled) return;
    if (hasChildren) {
      onExpand(node);
    }
    onDoubleClick?.(node);
  }, [node, hasChildren, onExpand, onDoubleClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(node, e);
  }, [node, onContextMenu]);

  const handleCheckChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (node.disabled) return;
    onCheck?.(node);
  }, [node, onCheck]);

  const getIcon = () => {
    if (node.icon) return node.icon;
    if (isLeaf) return <File className="h-4 w-4 text-muted-foreground" />;
    return isExpanded 
      ? <FolderOpen className="h-4 w-4 text-yellow-500" />
      : <Folder className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div
      className={cn(
        'tree-node',
        node.disabled && 'opacity-50 cursor-not-allowed',
        nodeClassName
      )}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-disabled={node.disabled}
    >
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors',
          'hover:bg-accent/50',
          isSelected && 'bg-accent text-accent-foreground',
          node.disabled && 'pointer-events-none'
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        draggable={draggable && !node.disabled}
      >
        {/* Expand/Collapse Icon */}
        <span
          className={cn(
            'flex-shrink-0 w-4 h-4 flex items-center justify-center',
            hasChildren ? 'cursor-pointer' : 'invisible'
          )}
          onClick={handleExpandClick}
        >
          {hasChildren && (
            isExpanded 
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />
          )}
        </span>

        {/* Checkbox */}
        {checkable && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckChange}
            className="h-4 w-4 rounded border-gray-300"
            disabled={node.disabled}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Icon */}
        {showIcons && (
          <span className="flex-shrink-0">
            {getIcon()}
          </span>
        )}

        {/* Label */}
        <span className="flex-1 truncate text-sm">
          {renderLabel ? renderLabel(node) : node.label}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className={cn('tree-children', showLines && 'border-l border-border ml-4')}>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              isSelected={false}
              isExpanded={false}
              isChecked={false}
              onSelect={onSelect}
              onExpand={onExpand}
              onCheck={onCheck}
              onDoubleClick={onDoubleClick}
              onContextMenu={onContextMenu}
              showIcons={showIcons}
              showLines={showLines}
              checkable={checkable}
              draggable={draggable}
              renderLabel={renderLabel}
              nodeClassName={nodeClassName}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TreeView: React.FC<TreeViewProps> = ({
  data,
  selectedIds = [],
  expandedIds: controlledExpandedIds,
  onSelect,
  onExpand,
  onDoubleClick,
  onContextMenu,
  multiSelect = false,
  showIcons = true,
  showLines = false,
  draggable = false,
  className,
  nodeClassName,
  renderLabel,
  filterText,
  defaultExpandAll = false,
  checkable = false,
  checkedIds = [],
  onCheck,
}) => {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(() => {
    if (defaultExpandAll) {
      const getAllIds = (nodes: TreeNode[]): string[] => {
        return nodes.flatMap(node => [
          node.id,
          ...(node.children ? getAllIds(node.children) : [])
        ]);
      };
      return new Set(getAllIds(data));
    }
    return new Set();
  });

  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(
    new Set(selectedIds)
  );

  const expandedIds = controlledExpandedIds 
    ? new Set(controlledExpandedIds) 
    : internalExpandedIds;

  const handleSelect = useCallback((node: TreeNode) => {
    const isSelected = internalSelectedIds.has(node.id);
    
    if (multiSelect) {
      const newSelected = new Set(internalSelectedIds);
      if (isSelected) {
        newSelected.delete(node.id);
      } else {
        newSelected.add(node.id);
      }
      setInternalSelectedIds(newSelected);
    } else {
      setInternalSelectedIds(new Set([node.id]));
    }
    
    onSelect?.(node, !isSelected);
  }, [internalSelectedIds, multiSelect, onSelect]);

  const handleExpand = useCallback((node: TreeNode) => {
    const isExpanded = expandedIds.has(node.id);
    
    if (!controlledExpandedIds) {
      const newExpanded = new Set(internalExpandedIds);
      if (isExpanded) {
        newExpanded.delete(node.id);
      } else {
        newExpanded.add(node.id);
      }
      setInternalExpandedIds(newExpanded);
    }
    
    onExpand?.(node, !isExpanded);
  }, [expandedIds, controlledExpandedIds, internalExpandedIds, onExpand]);

  const handleCheck = useCallback((node: TreeNode) => {
    const isChecked = checkedIds.includes(node.id);
    onCheck?.(node, !isChecked);
  }, [checkedIds, onCheck]);

  // Filter nodes if filterText is provided
  const filteredData = useMemo(() => {
    if (!filterText) return data;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matchesFilter = node.label.toLowerCase().includes(filterText.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        
        if (matchesFilter || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          });
        }
        
        return acc;
      }, []);
    };

    return filterNodes(data);
  }, [data, filterText]);

  return (
    <div
      className={cn('tree-view', className)}
      role="tree"
      aria-multiselectable={multiSelect}
    >
      {filteredData.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          level={0}
          isSelected={internalSelectedIds.has(node.id)}
          isExpanded={expandedIds.has(node.id)}
          isChecked={checkedIds.includes(node.id)}
          onSelect={handleSelect}
          onExpand={handleExpand}
          onCheck={handleCheck}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          showIcons={showIcons}
          showLines={showLines}
          checkable={checkable}
          draggable={draggable}
          renderLabel={renderLabel}
          nodeClassName={nodeClassName}
        />
      ))}
    </div>
  );
};

export default TreeView;
