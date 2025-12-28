import type { Meta, StoryObj } from '@storybook/react';
import { Treemap } from './Treemap';
const meta: Meta<typeof Treemap> = { title: 'Components/Charts/Treemap', component: Treemap, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithData: Story = { args: { data: { name: 'root', children: [{ name: 'A', value: 100 }, { name: 'B', value: 200 }] } } };
