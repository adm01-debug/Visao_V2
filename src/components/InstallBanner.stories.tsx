import type { Meta, StoryObj } from '@storybook/react';
import { InstallBanner } from './InstallBanner';
const meta: Meta<typeof InstallBanner> = { title: 'Components/PWA/InstallBanner', component: InstallBanner, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const Visible: Story = { args: { show: true } };
