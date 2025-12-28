import type { Meta, StoryObj } from '@storybook/react';
import { RuleCard } from './RuleCard';
const meta: Meta<typeof RuleCard> = { title: 'Components/Rules/RuleCard', component: RuleCard, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { rule: { id: '1', name: 'Regra 1', enabled: true } } };
export const Disabled: Story = { args: { rule: { id: '2', name: 'Regra 2', enabled: false } } };
