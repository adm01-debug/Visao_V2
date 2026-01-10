import type { Meta, StoryObj } from '@storybook/react';
import { AlertsChartWidget } from './AlertsChartWidget';

const meta: Meta<typeof AlertsChartWidget> = { title: 'Widgets/AlertsChartWidget', component: AlertsChartWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof AlertsChartWidget>;
export const Default: Story = {};

