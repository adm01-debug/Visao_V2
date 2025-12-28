import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../hover-card';

describe('HoverCard', () => {
  it('deve renderizar trigger', () => {
    render(<HoverCard><HoverCardTrigger>Hover</HoverCardTrigger><HoverCardContent>Content</HoverCardContent></HoverCard>);
    expect(screen.getByText('Hover')).toBeInTheDocument();
  });

  it('deve mostrar content ao hover', async () => {
    render(<HoverCard><HoverCardTrigger>Hover</HoverCardTrigger><HoverCardContent>Content</HoverCardContent></HoverCard>);
    fireEvent.mouseEnter(screen.getByText('Hover'));
    expect(await screen.findByText('Content')).toBeInTheDocument();
  });
});
