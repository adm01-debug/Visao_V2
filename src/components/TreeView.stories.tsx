import type { Meta, StoryObj } from '@storybook/react';
import { TreeView } from './TreeView';
const meta: Meta<typeof TreeView> = { title: 'Components/Display/TreeView', component: TreeView, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { data: [{ id: '1', label: 'Raiz', children: [{ id: '2', label: 'Filho' }] }] } };
