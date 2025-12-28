import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';

describe('Popover', () => {
  it('deve renderizar trigger', () => {
    render(<Popover><PopoverTrigger>Open</PopoverTrigger><PopoverContent>Content</PopoverContent></Popover>);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('deve abrir ao clicar', async () => {
    render(<Popover><PopoverTrigger>Open</PopoverTrigger><PopoverContent>Content</PopoverContent></Popover>);
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Content')).toBeInTheDocument();
  });

  it('deve aceitar className no content', async () => {
    render(<Popover><PopoverTrigger>Open</PopoverTrigger><PopoverContent className="custom">Content</PopoverContent></Popover>);
    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Content')).toHaveClass('custom');
  });
});
