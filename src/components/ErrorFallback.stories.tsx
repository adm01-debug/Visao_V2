import type { Meta, StoryObj } from '@storybook/react';
import { ErrorFallback } from './ErrorFallback';

const meta: Meta<typeof ErrorFallback> = {
  title: 'Components/Feedback/ErrorFallback',
  component: ErrorFallback,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Componente de fallback para erros de renderização.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { error: new Error('Erro de exemplo') } };
export const WithRetry: Story = { args: { error: new Error('Erro'), resetErrorBoundary: () => console.log('Retry') } };
