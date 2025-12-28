import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarProvider } from '../sidebar';

describe('Sidebar', () => {
  const renderSidebar = () => render(
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>Header</SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>Item 1</SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>Footer</SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );

  it('deve renderizar sidebar', () => {
    renderSidebar();
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('deve exibir menu items', () => {
    renderSidebar();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('deve exibir footer', () => {
    renderSidebar();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
