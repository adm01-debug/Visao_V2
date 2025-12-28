import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';

describe('Tooltip', () => {
  const renderTooltip = () => render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent>Tooltip content</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  it('deve renderizar trigger', () => {
    renderTooltip();
    expect(screen.getByText('Hover')).toBeInTheDocument();
  });

  it('deve mostrar content ao hover', async () => {
    renderTooltip();
    fireEvent.mouseEnter(screen.getByText('Hover'));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });
});
