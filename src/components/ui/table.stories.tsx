import type { Meta, StoryObj } from '@storybook/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

const meta: Meta<typeof Table> = { title: 'UI/Table', component: Table, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Table>;
export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>João</TableCell>
          <TableCell>joao@email.com</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

