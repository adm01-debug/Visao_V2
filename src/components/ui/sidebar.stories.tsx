import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from './sidebar';

const meta: Meta<typeof Sidebar> = { title: 'UI/Sidebar', component: Sidebar, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Sidebar>;
export const Default: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>Header</SidebarHeader>
        <SidebarContent>Content</SidebarContent>
      </Sidebar>
    </SidebarProvider>
  ),
};

