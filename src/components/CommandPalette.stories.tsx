import type { Meta, StoryObj } from '@storybook/react';
import { CommandPalette } from './CommandPalette';

const meta: Meta<typeof CommandPalette> = {
  title: 'Components/Navigation/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Paleta de comandos com busca e atalhos (Ctrl+K).' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { open: true } };
export const WithCommands: Story = {
  args: {
    open: true,
    commands: [
      { id: '1', label: 'Dashboard', shortcut: 'D' },
      { id: '2', label: 'Câmeras', shortcut: 'C' },
      { id: '3', label: 'Alertas', shortcut: 'A' },
    ],
  },
};
