import type { Meta, StoryObj } from '@storybook/react';
import { FloatingActionButton } from './FloatingActionButton';

const meta: Meta<typeof FloatingActionButton> = { title: 'UI/FloatingActionButton', component: FloatingActionButton, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof FloatingActionButton>;
export const Default: Story = { args: { onClick: () => {} } };

