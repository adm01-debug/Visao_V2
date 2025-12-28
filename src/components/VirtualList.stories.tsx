import type { Meta, StoryObj } from '@storybook/react';
import { VirtualList } from './VirtualList';
const meta: Meta<typeof VirtualList> = { title: 'Components/Display/VirtualList', component: VirtualList, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `Item ${i}` })), itemHeight: 50 } };
