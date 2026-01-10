import type { Meta, StoryObj } from '@storybook/react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';

const meta: Meta<typeof Command> = { title: 'UI/Command', component: Command, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Command>;
export const Default: Story = {
  render: () => (
    <Command className='rounded-lg border shadow-md'>
      <CommandInput placeholder='Buscar...' />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        <CommandGroup heading='Sugestões'>
          <CommandItem>Item 1</CommandItem>
          <CommandItem>Item 2</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

