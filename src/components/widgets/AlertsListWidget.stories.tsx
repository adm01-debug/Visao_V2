import type { Meta, StoryObj } from '@storybook/react';
import { AlertsListWidget } from './AlertsListWidget';

const meta: Meta<typeof AlertsListWidget> = { title: 'Widgets/AlertsListWidget', component: AlertsListWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof AlertsListWidget>;
export const Default: Story = {};

