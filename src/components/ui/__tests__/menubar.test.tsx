import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '../menubar';

describe('Menubar', () => {
  const renderMenubar = () => render(
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );

  it('deve renderizar menubar', () => {
    renderMenubar();
    expect(screen.getByRole('menubar')).toBeInTheDocument();
  });

  it('deve exibir trigger', () => {
    renderMenubar();
    expect(screen.getByText('File')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    renderMenubar();
    fireEvent.click(screen.getByText('File'));
    expect(await screen.findByText('New')).toBeInTheDocument();
  });
});
