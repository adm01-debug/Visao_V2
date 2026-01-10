import type { Meta, StoryObj } from '@storybook/react';
import { CamerasGridWidget } from './CamerasGridWidget';

const meta: Meta<typeof CamerasGridWidget> = { title: 'Widgets/CamerasGridWidget', component: CamerasGridWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof CamerasGridWidget>;
export const Default: Story = {};

