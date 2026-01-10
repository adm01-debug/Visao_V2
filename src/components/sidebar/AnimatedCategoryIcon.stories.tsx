import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedCategoryIcon } from './AnimatedCategoryIcon';

const meta: Meta<typeof AnimatedCategoryIcon> = { title: 'Sidebar/AnimatedCategoryIcon', component: AnimatedCategoryIcon, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof AnimatedCategoryIcon>;
export const Default: Story = { args: { category: 'cameras' } };

