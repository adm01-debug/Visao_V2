import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertDescription, AlertTitle } from './alert';

const meta: Meta<typeof Alert> = { title: 'UI/Alert', component: Alert, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Alert>;
export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Atenção!</AlertTitle>
      <AlertDescription>Esta é uma mensagem de alerta.</AlertDescription>
    </Alert>
  ),
};
export const Destructive: Story = {
  render: () => (
    <Alert variant='destructive'>
      <AlertTitle>Erro!</AlertTitle>
      <AlertDescription>Algo deu errado.</AlertDescription>
    </Alert>
  ),
};

