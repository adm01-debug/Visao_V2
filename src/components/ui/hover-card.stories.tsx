import type { Meta, StoryObj } from '@storybook/react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card';
import { Button } from './button';

const meta: Meta<typeof HoverCard> = { title: 'UI/HoverCard', component: HoverCard, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof HoverCard>;
export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant='link'>Hover me</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <p>Hover card content here</p>
      </HoverCardContent>
    </HoverCard>
  ),
};

