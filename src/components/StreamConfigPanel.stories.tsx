import type { Meta, StoryObj } from '@storybook/react';
import { StreamConfigPanel } from './StreamConfigPanel';
const meta: Meta<typeof StreamConfigPanel> = { title: 'Components/Camera/StreamConfigPanel', component: StreamConfigPanel, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithConfig: Story = { args: { config: { quality: '1080p', fps: 30 } } };
