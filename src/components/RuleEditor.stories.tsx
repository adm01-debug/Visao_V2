import type { Meta, StoryObj } from '@storybook/react';
import { RuleEditor } from './RuleEditor';
const meta: Meta<typeof RuleEditor> = { title: 'Components/Rules/RuleEditor', component: RuleEditor, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const Editing: Story = { args: { rule: { id: '1', name: 'Regra existente', conditions: [] } } };
