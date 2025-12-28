import type { Meta, StoryObj } from '@storybook/react';
import { AudioPlayer } from './AudioPlayer';

const meta: Meta<typeof AudioPlayer> = {
  title: 'Components/Media/AudioPlayer',
  component: AudioPlayer,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Player de áudio customizado com controles de reprodução.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { src: '/audio/sample.mp3' } };
export const WithTitle: Story = { args: { src: '/audio/sample.mp3', title: 'Gravação de Alerta' } };
export const AutoPlay: Story = { args: { src: '/audio/sample.mp3', autoPlay: true } };
export const Loop: Story = { args: { src: '/audio/sample.mp3', loop: true } };
