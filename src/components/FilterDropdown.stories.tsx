import type { Meta, StoryObj } from '@storybook/react';
import { FilterDropdown } from './FilterDropdown';

const meta: Meta<typeof FilterDropdown> = {
  title: 'Components/Form/FilterDropdown',
  component: FilterDropdown,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Dropdown de filtros com múltiplas opções.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { options: [{ value: 'all', label: 'Todos' }, { value: 'active', label: 'Ativos' }] } };
export const WithSelected: Story = { args: { options: [{ value: 'all', label: 'Todos' }], value: 'all' } };
export const Multiple: Story = { args: { options: [{ value: '1', label: 'Opção 1' }, { value: '2', label: 'Opção 2' }], multiple: true } };
