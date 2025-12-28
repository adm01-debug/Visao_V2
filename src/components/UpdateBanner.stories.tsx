import type { Meta, StoryObj } from '@storybook/react';
import { UpdateBanner } from './UpdateBanner';
const meta: Meta<typeof UpdateBanner> = { title: 'Components/PWA/UpdateBanner', component: UpdateBanner, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { show: true } };
export const WithVersion: Story = { args: { show: true, version: '2.0.0' } };
