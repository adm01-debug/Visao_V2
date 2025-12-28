import type { Meta, StoryObj } from '@storybook/react';
import { FloatingAction } from './FloatingAction';

const meta: Meta<typeof FloatingAction> = {
  title: 'Components/Actions/FloatingAction',
  component: FloatingAction,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Botão de ação flutuante (FAB).' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { icon: 'Plus' } };
export const WithLabel: Story = { args: { icon: 'Plus', label: 'Adicionar' } };
export const Multiple: Story = { args: { actions: [{ icon: 'Camera', label: 'Câmera' }, { icon: 'Bell', label: 'Alerta' }] } };
