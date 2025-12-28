import type { Meta, StoryObj } from '@storybook/react';
import { Sankey } from './Sankey';
const meta: Meta<typeof Sankey> = { title: 'Components/Charts/Sankey', component: Sankey, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithData: Story = { args: { nodes: [{ name: 'A' }, { name: 'B' }], links: [{ source: 0, target: 1, value: 10 }] } };
