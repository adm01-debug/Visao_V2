import type { Meta, StoryObj } from '@storybook/react';
import { A11yAnnouncer } from './A11yAnnouncer';

const meta: Meta<typeof A11yAnnouncer> = {
  title: 'Components/Accessibility/A11yAnnouncer',
  component: A11yAnnouncer,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Componente para anúncios de acessibilidade via ARIA live regions.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithMessage: Story = { args: { message: 'Conteúdo carregado com sucesso' } };
export const Polite: Story = { args: { message: 'Atualização disponível', politeness: 'polite' } };
export const Assertive: Story = { args: { message: 'Erro crítico detectado', politeness: 'assertive' } };
