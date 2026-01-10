import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './data-table';

const meta: Meta<typeof DataTable> = { title: 'UI/data-table', component: DataTable, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof DataTable>;
export const Default: Story = {
  args: {
    columns: [{ accessorKey: 'name', header: 'Name' }, { accessorKey: 'status', header: 'Status' }],
    data: [{ name: 'Item 1', status: 'Active' }, { name: 'Item 2', status: 'Inactive' }],
  },
};

