import type { Meta, StoryObj } from '@storybook/react';
import { PaginationControls } from './PaginationControls';
const meta: Meta<typeof PaginationControls> = { title: 'Components/Navigation/PaginationControls', component: PaginationControls, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { currentPage: 1, totalPages: 10 } };
export const Middle: Story = { args: { currentPage: 5, totalPages: 10 } };
