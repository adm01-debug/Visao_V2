import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../context-menu';

describe('ContextMenu', () => {
  const renderMenu = () => render(
    <ContextMenu>
      <ContextMenuTrigger>Right click</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Item 1</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  it('deve renderizar trigger', () => {
    renderMenu();
    expect(screen.getByText('Right click')).toBeInTheDocument();
  });

  it('deve abrir com context menu', async () => {
    renderMenu();
    fireEvent.contextMenu(screen.getByText('Right click'));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });
});
