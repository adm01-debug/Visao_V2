import type { Meta, StoryObj } from '@storybook/react';
import { CategoryStatusIndicator } from './CategoryStatusIndicator';

const meta: Meta<typeof CategoryStatusIndicator> = { title: 'Sidebar/CategoryStatusIndicator', component: CategoryStatusIndicator, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof CategoryStatusIndicator>;
export const Default: Story = { args: { status: 'active' } };

