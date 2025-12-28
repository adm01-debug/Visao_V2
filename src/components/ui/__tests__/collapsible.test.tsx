import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../collapsible';

describe('Collapsible', () => {
  it('deve renderizar trigger', () => {
    render(<Collapsible><CollapsibleTrigger>Toggle</CollapsibleTrigger><CollapsibleContent>Content</CollapsibleContent></Collapsible>);
    expect(screen.getByText('Toggle')).toBeInTheDocument();
  });

  it('deve expandir ao clicar', async () => {
    render(<Collapsible><CollapsibleTrigger>Toggle</CollapsibleTrigger><CollapsibleContent>Content</CollapsibleContent></Collapsible>);
    fireEvent.click(screen.getByText('Toggle'));
    expect(await screen.findByText('Content')).toBeVisible();
  });

  it('deve aceitar defaultOpen', () => {
    render(<Collapsible defaultOpen><CollapsibleTrigger>Toggle</CollapsibleTrigger><CollapsibleContent>Content</CollapsibleContent></Collapsible>);
    expect(screen.getByText('Content')).toBeVisible();
  });
});
