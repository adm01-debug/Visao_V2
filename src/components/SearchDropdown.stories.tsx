import type { Meta, StoryObj } from '@storybook/react';
import { SearchDropdown } from './SearchDropdown';
const meta: Meta<typeof SearchDropdown> = { title: 'Components/Form/SearchDropdown', component: SearchDropdown, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { options: [{ value: '1', label: 'Opção 1' }] } };
