import type { Meta, StoryObj } from '@storybook/react';
import { StatsWidget } from './StatsWidget';

const meta: Meta<typeof StatsWidget> = { title: 'Widgets/StatsWidget', component: StatsWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof StatsWidget>;
export const Default: Story = {};

