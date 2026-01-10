import type { Meta, StoryObj } from '@storybook/react';
import { NotificationCenter } from './NotificationCenter';

const meta: Meta<typeof NotificationCenter> = { title: 'UI/NotificationCenter', component: NotificationCenter, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof NotificationCenter>;
export const Default: Story = {};

