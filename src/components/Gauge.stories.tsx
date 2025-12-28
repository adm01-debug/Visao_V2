import type { Meta, StoryObj } from '@storybook/react';
import { Gauge } from './Gauge';

const meta: Meta<typeof Gauge> = {
  title: 'Components/Charts/Gauge',
  component: Gauge,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Medidor circular de progresso/valor.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { value: 75 } };
export const Low: Story = { args: { value: 25, color: 'red' } };
export const High: Story = { args: { value: 95, color: 'green' } };
export const WithLabel: Story = { args: { value: 60, label: 'CPU', suffix: '%' } };
