import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '../sheet';

describe('Sheet', () => {
  const renderSheet = () => render(
    <Sheet>
      <SheetTrigger>Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Título</SheetTitle>
          <SheetDescription>Descrição</SheetDescription>
        </SheetHeader>
        <SheetFooter>Footer</SheetFooter>
      </SheetContent>
    </Sheet>
  );

  it('deve renderizar trigger', () => {
    renderSheet();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    renderSheet();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('deve exibir título', async () => {
    renderSheet();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Título')).toBeInTheDocument();
  });
});
