import type { Meta, StoryObj } from '@storybook/react';
import { Changelog } from './Changelog';

const meta: Meta<typeof Changelog> = {
  title: 'Components/Display/Changelog',
  component: Changelog,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Exibição de changelog/histórico de versões do sistema.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithEntries: Story = {
  args: {
    entries: [
      { version: '2.0.0', date: '2025-12-28', changes: ['Nova interface', 'Melhorias de performance'] },
      { version: '1.5.0', date: '2025-12-01', changes: ['Correção de bugs', 'Novas funcionalidades'] },
    ],
  },
};
