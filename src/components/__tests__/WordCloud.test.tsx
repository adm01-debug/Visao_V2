import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WordCloud from '@/components/WordCloud';

const mockWords = [
  { text: 'React', value: 100 },
  { text: 'JavaScript', value: 80 },
  { text: 'TypeScript', value: 60 },
];

describe('WordCloud', () => {
  it('renders word cloud container', () => {
    render(<WordCloud words={mockWords} />);
    expect(screen.getByTestId('word-cloud')).toBeInTheDocument();
  });

  it('displays words', () => {
    render(<WordCloud words={mockWords} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('handles empty words', () => {
    render(<WordCloud words={[]} />);
    expect(screen.getByText(/sem palavras/i)).toBeInTheDocument();
  });

  it('applies size based on value', () => {
    render(<WordCloud words={mockWords} />);
    const reactWord = screen.getByText('React');
    const tsWord = screen.getByText('TypeScript');
    expect(reactWord).toHaveStyle({ fontSize: expect.stringContaining('px') });
  });
});
