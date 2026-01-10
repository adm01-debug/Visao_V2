import type { Meta, StoryObj } from '@storybook/react';
import { EnhancedWidgets } from './EnhancedWidgets';

const meta: Meta<typeof EnhancedWidgets> = { title: 'Widgets/EnhancedWidgets', component: EnhancedWidgets, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof EnhancedWidgets>;
export const Default: Story = {};

