import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModalProvider, useModal } from '../ModalProvider';

const TestComponent = () => {
  const { openModal, closeModal } = useModal();
  return (
    <div>
      <button onClick={() => openModal('test', { title: 'Test' })}>Open</button>
      <button onClick={closeModal}>Close</button>
    </div>
  );
};

describe('ModalProvider', () => {
  it('provides modal context', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('opens modal when openModal is called', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes modal when closeModal is called', () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
