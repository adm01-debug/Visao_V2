import type { Meta, StoryObj } from '@storybook/react';
import { CameraMapWidget } from './CameraMapWidget';

const meta: Meta<typeof CameraMapWidget> = { title: 'Widgets/CameraMapWidget', component: CameraMapWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof CameraMapWidget>;
export const Default: Story = {};

