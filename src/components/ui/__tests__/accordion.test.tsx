import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../accordion';

describe('Accordion', () => {
  const renderAccordion = () => render(
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>Item 1</AccordionTrigger>
        <AccordionContent>Content 1</AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  it('deve renderizar trigger', () => {
    renderAccordion();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('deve expandir ao clicar', async () => {
    renderAccordion();
    fireEvent.click(screen.getByText('Item 1'));
    expect(await screen.findByText('Content 1')).toBeVisible();
  });

  it('deve colapsar ao clicar novamente', async () => {
    renderAccordion();
    fireEvent.click(screen.getByText('Item 1'));
    fireEvent.click(screen.getByText('Item 1'));
    expect(screen.queryByText('Content 1')).not.toBeVisible();
  });
});
