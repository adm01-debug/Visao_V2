import type { Meta, StoryObj } from '@storybook/react';
import { AccessDenied } from './AccessDenied';
import { BrowserRouter } from 'react-router-dom';

const meta: Meta<typeof AccessDenied> = {
  title: 'Components/Feedback/AccessDenied',
  component: AccessDenied,
  tags: ['autodocs'],
  decorators: [(Story) => <BrowserRouter><Story /></BrowserRouter>],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Página exibida quando o usuário não tem permissão de acesso.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithCustomMessage: Story = { args: { message: 'Você não tem permissão para acessar esta área.' } };
export const WithReturnPath: Story = { args: { returnPath: '/dashboard' } };
