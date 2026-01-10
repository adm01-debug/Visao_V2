import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './DataTable';

const meta: Meta<typeof DataTable> = { title: 'UI/DataTable', component: DataTable, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof DataTable>;
export const Default: Story = {
  args: {
    columns: [{ accessorKey: 'name', header: 'Nome' }],
    data: [{ name: 'Item 1' }, { name: 'Item 2' }],
  },
};

