import type { Meta, StoryObj } from '@storybook/react';
import { ChartContainer } from './chart';

const meta: Meta<typeof ChartContainer> = { title: 'UI/Chart', component: ChartContainer, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof ChartContainer>;
export const Default: Story = {
  args: { config: {}, children: <div>Chart placeholder</div> },
};

