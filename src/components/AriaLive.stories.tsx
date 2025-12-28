import type { Meta, StoryObj } from '@storybook/react';
import { AriaLive } from './AriaLive';

const meta: Meta<typeof AriaLive> = {
  title: 'Components/Accessibility/AriaLive',
  component: AriaLive,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Região ARIA live para anúncios dinâmicos de acessibilidade.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Conteúdo dinâmico' } };
export const Polite: Story = { args: { children: 'Atualização suave', politeness: 'polite' } };
export const Assertive: Story = { args: { children: 'Mensagem urgente!', politeness: 'assertive' } };
export const Off: Story = { args: { children: 'Conteúdo silencioso', politeness: 'off' } };
