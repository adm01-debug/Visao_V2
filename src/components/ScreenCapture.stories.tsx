import type { Meta, StoryObj } from '@storybook/react';
import { ScreenCapture } from './ScreenCapture';
const meta: Meta<typeof ScreenCapture> = { title: 'Components/Media/ScreenCapture', component: ScreenCapture, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithPreview: Story = { args: { showPreview: true } };
