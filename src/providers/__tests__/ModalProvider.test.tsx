import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ModalProvider, useModal } from '@/providers/ModalProvider';

const TestComponent = () => {
  const { isOpen, open, close } = useModal();
  return (
    <>
      <button onClick={open}>Open</button>
      <button onClick={close}>Close</button>
      <span data-testid="status">{isOpen ? 'open' : 'closed'}</span>
    </>
  );
};

describe('ModalProvider', () => {
  it('renders children', () => {
    render(<ModalProvider><div>Content</div></ModalProvider>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('provides modal context with open/close', () => {
    render(<ModalProvider><TestComponent /></ModalProvider>);
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('closed');
    
    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(screen.getByTestId('status')).toHaveTextContent('open');
  });
});
