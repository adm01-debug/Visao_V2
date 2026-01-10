import type { Meta, StoryObj } from '@storybook/react';
import { NotificationSettingsPanel } from './NotificationSettingsPanel';

const meta: Meta<typeof NotificationSettingsPanel> = { title: 'Settings/NotificationSettingsPanel', component: NotificationSettingsPanel, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof NotificationSettingsPanel>;
export const Default: Story = {};

