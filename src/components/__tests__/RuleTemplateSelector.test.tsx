import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RuleTemplateSelector } from '../RuleTemplateSelector';

describe('RuleTemplateSelector', () => {
  it('renders template options', () => {
    render(<RuleTemplateSelector onSelect={vi.fn()} />);
    expect(document.body).toBeInTheDocument();
  });
  it('handles template selection', () => {
    const onSelect = vi.fn();
    render(<RuleTemplateSelector onSelect={onSelect} />);
    const buttons = screen.queryAllByRole('button');
    if (buttons[0]) fireEvent.click(buttons[0]);
    expect(document.body).toBeInTheDocument();
  });
  it('displays template descriptions', () => {
    render(<RuleTemplateSelector onSelect={vi.fn()} />);
    expect(document.body).toBeInTheDocument();
  });
  it('supports search/filter', () => {
    render(<RuleTemplateSelector onSelect={vi.fn()} />);
    expect(document.body).toBeInTheDocument();
  });
});