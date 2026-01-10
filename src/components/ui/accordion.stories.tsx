import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

const meta: Meta<typeof Accordion> = { title: 'UI/Accordion', component: Accordion, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Accordion>;
export const Default: Story = {
  render: () => (
    <Accordion type='single' collapsible>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Seção 1</AccordionTrigger>
        <AccordionContent>Conteúdo da seção 1</AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Seção 2</AccordionTrigger>
        <AccordionContent>Conteúdo da seção 2</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

