import type { Meta, StoryObj } from '@storybook/react';
import { MediaRecorder } from './MediaRecorder';
const meta: Meta<typeof MediaRecorder> = { title: 'Components/Media/MediaRecorder', component: MediaRecorder, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const AudioOnly: Story = { args: { audio: true, video: false } };
export const VideoOnly: Story = { args: { audio: false, video: true } };
