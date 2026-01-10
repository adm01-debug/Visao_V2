import type { Meta, StoryObj } from '@storybook/react';
import { QuickActionsWidget } from './QuickActionsWidget';

const meta: Meta<typeof QuickActionsWidget> = { title: 'Widgets/QuickActionsWidget', component: QuickActionsWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof QuickActionsWidget>;
export const Default: Story = {};

