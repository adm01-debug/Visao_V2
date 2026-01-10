import type { Meta, StoryObj } from '@storybook/react';
import { SystemHealthWidget } from './SystemHealthWidget';

const meta: Meta<typeof SystemHealthWidget> = { title: 'Widgets/SystemHealthWidget', component: SystemHealthWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof SystemHealthWidget>;
export const Default: Story = {};

