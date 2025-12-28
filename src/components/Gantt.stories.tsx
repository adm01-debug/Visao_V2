import type { Meta, StoryObj } from '@storybook/react';
import { Gantt } from './Gantt';

const meta: Meta<typeof Gantt> = {
  title: 'Components/Charts/Gantt',
  component: Gantt,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Gráfico de Gantt para visualização de timeline.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithTasks: Story = { args: { tasks: [{ id: '1', name: 'Tarefa 1', start: new Date(), end: new Date(Date.now() + 86400000) }] } };
