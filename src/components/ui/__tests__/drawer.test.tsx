import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '../drawer';

describe('Drawer', () => {
  const renderDrawer = () => render(
    <Drawer>
      <DrawerTrigger>Open</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Título</DrawerTitle>
          <DrawerDescription>Descrição</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>Footer</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );

  it('deve renderizar trigger', () => {
    renderDrawer();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    renderDrawer();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Título')).toBeInTheDocument();
  });

  it('deve exibir descrição', async () => {
    renderDrawer();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Descrição')).toBeInTheDocument();
  });
});
