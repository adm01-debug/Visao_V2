import type { Meta, StoryObj } from '@storybook/react';
import { BottomSheet } from './BottomSheet';

const meta: Meta<typeof BottomSheet> = { title: 'UI/BottomSheet', component: BottomSheet, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof BottomSheet>;
export const Default: Story = {
  args: { open: true, onClose: () => {}, children: <p>Content</p> },
};

