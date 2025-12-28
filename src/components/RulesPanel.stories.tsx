import type { Meta, StoryObj } from '@storybook/react';
import { RulesPanel } from './RulesPanel';
const meta: Meta<typeof RulesPanel> = { title: 'Components/Rules/RulesPanel', component: RulesPanel, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithRules: Story = { args: { rules: [{ id: '1', name: 'Regra 1' }] } };
