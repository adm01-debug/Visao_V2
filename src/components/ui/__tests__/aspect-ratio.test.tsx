import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AspectRatio } from '../aspect-ratio';

describe('AspectRatio', () => {
  it('deve renderizar corretamente', () => {
    render(<AspectRatio ratio={16/9}><div data-testid="child">Content</div></AspectRatio>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('deve aceitar ratio 16/9', () => {
    const { container } = render(<AspectRatio ratio={16/9}><div>Content</div></AspectRatio>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('deve aceitar ratio 1/1', () => {
    const { container } = render(<AspectRatio ratio={1}><div>Content</div></AspectRatio>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('deve aceitar ratio 4/3', () => {
    const { container } = render(<AspectRatio ratio={4/3}><div>Content</div></AspectRatio>);
    expect(container.firstChild).toBeInTheDocument();
  });
});
