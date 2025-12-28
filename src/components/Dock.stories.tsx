import type { Meta, StoryObj } from '@storybook/react';
import { Dock } from './Dock';

const meta: Meta<typeof Dock> = {
  title: 'Components/Navigation/Dock',
  component: Dock,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Dock de aplicativos estilo macOS.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithItems: Story = { args: { items: [{ id: '1', icon: 'Home', label: 'Dashboard' }, { id: '2', icon: 'Camera', label: 'Câmeras' }] } };
export const Bottom: Story = { args: { position: 'bottom' } };
