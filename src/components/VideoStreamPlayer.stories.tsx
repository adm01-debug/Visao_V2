import type { Meta, StoryObj } from '@storybook/react';
import { VideoStreamPlayer } from './VideoStreamPlayer';
const meta: Meta<typeof VideoStreamPlayer> = { title: 'Components/Media/VideoStreamPlayer', component: VideoStreamPlayer, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { src: 'rtsp://example.com/stream' } };
export const WithControls: Story = { args: { src: 'rtsp://example.com/stream', controls: true } };
export const Muted: Story = { args: { src: 'rtsp://example.com/stream', muted: true } };
