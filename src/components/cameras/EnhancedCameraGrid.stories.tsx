import type { Meta, StoryObj } from '@storybook/react';
import { CameraGrid } from './EnhancedCameraGrid';

const meta: Meta<typeof CameraGrid> = {
  title: 'Cameras/EnhancedCameraGrid',
  component: CameraGrid,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof CameraGrid>;
export const Default: Story = { args: { cameras: [] } };
