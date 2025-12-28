import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';

describe('DropdownMenu', () => {
  const renderMenu = () => render(
    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  it('deve renderizar trigger', () => {
    renderMenu();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    renderMenu();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });

  it('deve exibir itens', async () => {
    renderMenu();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Item 1')).toBeInTheDocument();
  });
});
