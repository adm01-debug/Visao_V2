import type { Meta, StoryObj } from '@storybook/react';
import { StatCard } from './EnhancedWidgets';

const meta: Meta<typeof StatCard> = {
  title: 'Widgets/EnhancedWidgets',
  component: StatCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof StatCard>;
export const Default: Story = {
  args: { label: 'Alertas hoje', value: 42, icon: null },
};
