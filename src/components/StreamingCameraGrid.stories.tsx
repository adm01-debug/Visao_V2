import type { Meta, StoryObj } from '@storybook/react';
import { StreamingCameraGrid } from './StreamingCameraGrid';
const meta: Meta<typeof StreamingCameraGrid> = { title: 'Components/Camera/StreamingCameraGrid', component: StreamingCameraGrid, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { cameras: [] } };
export const Grid2x2: Story = { args: { cameras: ['cam1', 'cam2', 'cam3', 'cam4'], layout: '2x2' } };
