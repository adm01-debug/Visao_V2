import type { Meta, StoryObj } from '@storybook/react';
import { MultiCameraRecognition } from './MultiCameraRecognition';
const meta: Meta<typeof MultiCameraRecognition> = { title: 'Components/Camera/MultiCameraRecognition', component: MultiCameraRecognition, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { cameras: ['cam-1', 'cam-2'] } };
