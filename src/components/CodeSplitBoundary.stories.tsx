import type { Meta, StoryObj } from '@storybook/react';
import { CodeSplitBoundary } from './CodeSplitBoundary';

const meta: Meta<typeof CodeSplitBoundary> = {
  title: 'Components/Utility/CodeSplitBoundary',
  component: CodeSplitBoundary,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Boundary para code splitting com fallback de loading.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: <div>Conteúdo carregado</div> } };
export const WithCustomFallback: Story = { args: { children: <div>Conteúdo</div>, fallback: <div>Carregando...</div> } };
