import type { Meta, StoryObj } from '@storybook/react';
import { Sunburst } from './Sunburst';
const meta: Meta<typeof Sunburst> = { title: 'Components/Charts/Sunburst', component: Sunburst, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithData: Story = { args: { data: { name: 'root', children: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }] } } };
