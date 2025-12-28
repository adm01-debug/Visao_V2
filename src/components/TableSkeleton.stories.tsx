import type { Meta, StoryObj } from '@storybook/react';
import { TableSkeleton } from './TableSkeleton';
const meta: Meta<typeof TableSkeleton> = { title: 'Components/Loading/TableSkeleton', component: TableSkeleton, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { rows: 5, columns: 4 } };
export const Large: Story = { args: { rows: 10, columns: 6 } };
