import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Button } from './button';

const meta: Meta<typeof DropdownMenu> = { title: 'UI/DropdownMenu', component: DropdownMenu, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof DropdownMenu>;
export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline'>Abrir Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
        <DropdownMenuItem>Item 2</DropdownMenuItem>
        <DropdownMenuItem>Item 3</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

