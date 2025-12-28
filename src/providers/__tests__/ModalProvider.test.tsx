import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModalProvider, useModal } from '@/providers/ModalProvider';

const TestComponent = () => {
  const { openModal, closeModal } = useModal();
  return (
    <>
      <button onClick={() => openModal(<div>Modal Content</div>)}>Open</button>
      <button onClick={closeModal}>Close</button>
    </>
  );
};

describe('ModalProvider', () => {
  it('renders children', () => {
    render(<ModalProvider><div>Child</div></ModalProvider>);
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('provides modal context', () => {
    render(<ModalProvider><TestComponent /></ModalProvider>);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('opens modal on trigger', () => {
    render(<ModalProvider><TestComponent /></ModalProvider>);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('closes modal on trigger', () => {
    render(<ModalProvider><TestComponent /></ModalProvider>);
    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });
});
