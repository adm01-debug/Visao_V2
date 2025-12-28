import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../dialog';

describe('Dialog', () => {
  const renderDialog = () => render(
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Descrição</DialogDescription>
        </DialogHeader>
        <DialogFooter>Footer</DialogFooter>
      </DialogContent>
    </Dialog>
  );

  it('deve renderizar trigger', () => {
    renderDialog();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('deve exibir título', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Título')).toBeInTheDocument();
  });

  it('deve exibir descrição', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Descrição')).toBeInTheDocument();
  });

  it('deve exibir footer', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Footer')).toBeInTheDocument();
  });
});
