import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../alert-dialog';

describe('AlertDialog', () => {
  const renderDialog = () => {
    return render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Título</AlertDialogTitle>
            <AlertDialogDescription>Descrição</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  it('deve renderizar trigger', () => {
    renderDialog();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('deve abrir ao clicar no trigger', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
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

  it('deve ter botão cancelar', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Cancelar')).toBeInTheDocument();
  });

  it('deve ter botão confirmar', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Confirmar')).toBeInTheDocument();
  });

  it('deve fechar ao clicar em cancelar', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(await screen.findByText('Cancelar'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
