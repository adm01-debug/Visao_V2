import type { Meta, StoryObj } from '@storybook/react';
import { OnlineIndicator, OfflineIndicator, LoadingIndicator } from './StatusIndicators';

const meta: Meta = { title: 'UI/StatusIndicators', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;
export const Online: Story = { render: () => <OnlineIndicator /> };
export const Offline: Story = { render: () => <OfflineIndicator /> };
export const Loading: Story = { render: () => <LoadingIndicator /> };

