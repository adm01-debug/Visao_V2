import type { Meta, StoryObj } from '@storybook/react';
import { Toast, ToastAction } from './toast';

const meta: Meta<typeof Toast> = { title: 'UI/Toast', component: Toast, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Toast>;
export const Default: Story = {
  args: { children: <p>Toast de notificação</p> },
};

