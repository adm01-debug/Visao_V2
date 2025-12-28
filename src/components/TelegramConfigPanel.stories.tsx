import type { Meta, StoryObj } from '@storybook/react';
import { TelegramConfigPanel } from './TelegramConfigPanel';
const meta: Meta<typeof TelegramConfigPanel> = { title: 'Components/Settings/TelegramConfigPanel', component: TelegramConfigPanel, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const Configured: Story = { args: { botToken: 'xxx', chatId: '123456' } };
