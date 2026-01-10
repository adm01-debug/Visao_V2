import type { Meta, StoryObj } from '@storybook/react';
import { SidebarComponents } from './SidebarComponents';

const meta: Meta<typeof SidebarComponents> = { title: 'Sidebar/SidebarComponents', component: SidebarComponents, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof SidebarComponents>;
export const Default: Story = {};

