import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stack, HStack, VStack } from '../Stack';

describe('Stack', () => {
  it('renders children', () => {
    render(<Stack><span>Item 1</span><span>Item 2</span></Stack>);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('applies row direction', () => {
    const { container } = render(<Stack direction="row">Content</Stack>);
    expect(container.firstChild).toHaveClass('flex-row');
  });

  it('applies column direction', () => {
    const { container } = render(<Stack direction="column">Content</Stack>);
    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('applies gap', () => {
    const { container } = render(<Stack gap={4}>Content</Stack>);
    expect(container.firstChild).toHaveClass('gap-4');
  });
});

describe('HStack', () => {
  it('renders as row', () => {
    const { container } = render(<HStack>Content</HStack>);
    expect(container.firstChild).toHaveClass('flex-row');
  });
});

describe('VStack', () => {
  it('renders as column', () => {
    const { container } = render(<VStack>Content</VStack>);
    expect(container.firstChild).toHaveClass('flex-col');
  });
});
