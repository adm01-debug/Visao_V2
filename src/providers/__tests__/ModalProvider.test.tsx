import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModalProvider, useModal } from '@/providers/ModalProvider';

const TestComponent = () => {
  const { openModal, closeModal } = useModal();
  return (
    <>
      <button onClick={() => openModal({ content: <div>Modal Content</div> })}>Open</button>
      <button onClick={closeModal}>Close</button>
    </>
  );
};

describe('ModalProvider', () => {
  it('renders children', () => {
    render(<ModalProvider><div>Content</div></ModalProvider>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('provides modal context', () => {
    render(<ModalProvider><TestComponent /></ModalProvider>);
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
  });
});
