import type { Meta, StoryObj } from '@storybook/react';
import { ContextualHelp } from './ContextualHelp';

const meta: Meta<typeof ContextualHelp> = {
  title: 'Components/Feedback/ContextualHelp',
  component: ContextualHelp,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Componente de ajuda contextual com popover.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { title: 'Ajuda', content: 'Este é um texto de ajuda contextual.' } };
export const WithLink: Story = { args: { title: 'Saiba mais', content: 'Clique no link para mais informações.', link: '/docs' } };
