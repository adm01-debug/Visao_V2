import type { Meta, StoryObj } from '@storybook/react';
import { QuickSearchDialog } from './QuickSearchDialog';

const meta: Meta<typeof QuickSearchDialog> = { title: 'Sidebar/QuickSearchDialog', component: QuickSearchDialog, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof QuickSearchDialog>;
export const Default: Story = { args: { open: true, onClose: () => {} } };

