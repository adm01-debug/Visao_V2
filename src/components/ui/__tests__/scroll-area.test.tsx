import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScrollArea } from '../scroll-area';

describe('ScrollArea', () => {
  it('deve renderizar corretamente', () => {
    render(<ScrollArea className="h-[200px]"><div>Content</div></ScrollArea>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('deve aceitar className', () => {
    render(<ScrollArea className="custom-scroll" data-testid="scroll"><div>Content</div></ScrollArea>);
    expect(screen.getByTestId('scroll')).toHaveClass('custom-scroll');
  });

  it('deve renderizar conteúdo longo', () => {
    render(<ScrollArea className="h-[100px]"><div style={{height: 500}}>Long content</div></ScrollArea>);
    expect(screen.getByText('Long content')).toBeInTheDocument();
  });
});
