import type { Meta, StoryObj } from '@storybook/react';
import { NotificationToast, NotificationBadge } from './Notifications';

const meta: Meta = { title: 'UI/Notifications', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;
export const Toast: Story = { render: () => <NotificationToast message='Notificação!' /> };
export const Badge: Story = { render: () => <NotificationBadge count={5} /> };

