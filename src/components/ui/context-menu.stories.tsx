import type { Meta, StoryObj } from '@storybook/react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './context-menu';

const meta: Meta<typeof ContextMenu> = { title: 'UI/ContextMenu', component: ContextMenu, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof ContextMenu>;
export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className='flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed'>
        Clique direito aqui
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Copiar</ContextMenuItem>
        <ContextMenuItem>Colar</ContextMenuItem>
        <ContextMenuItem>Deletar</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

