import type { Meta, StoryObj } from '@storybook/react';
import { WidgetRenderer } from './WidgetRenderer';

const meta: Meta<typeof WidgetRenderer> = { title: 'Widgets/WidgetRenderer', component: WidgetRenderer, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof WidgetRenderer>;
export const Default: Story = { args: { type: 'stats' } };

