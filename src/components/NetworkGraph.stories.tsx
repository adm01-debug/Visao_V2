import type { Meta, StoryObj } from '@storybook/react';
import { NetworkGraph } from './NetworkGraph';

const meta: Meta<typeof NetworkGraph> = {
  title: 'Components/Charts/NetworkGraph',
  component: NetworkGraph,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Gráfico de rede/conexões.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithNodes: Story = { args: { nodes: [{ id: '1', label: 'Servidor' }, { id: '2', label: 'Câmera' }], edges: [{ source: '1', target: '2' }] } };
