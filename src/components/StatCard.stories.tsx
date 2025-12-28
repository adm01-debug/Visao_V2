import type { Meta, StoryObj } from '@storybook/react';
import { StatCard } from './StatCard';
const meta: Meta<typeof StatCard> = { title: 'Components/Display/StatCard', component: StatCard, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { title: 'Câmeras', value: 12 } };
export const WithTrend: Story = { args: { title: 'Alertas', value: 45, trend: 12, trendUp: true } };
export const WithIcon: Story = { args: { title: 'Online', value: 8, icon: 'Camera' } };
