import type { Meta, StoryObj } from '@storybook/react';
import { NotificationsPanel } from './NotificationsPanel';
const meta: Meta<typeof NotificationsPanel> = { title: 'Components/Feedback/NotificationsPanel', component: NotificationsPanel, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithNotifications: Story = { args: { notifications: [{ id: '1', title: 'Alerta', message: 'Movimento detectado' }] } };
