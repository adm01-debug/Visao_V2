import type { Meta, StoryObj } from '@storybook/react';
import { MaskedInput } from './MaskedInput';
const meta: Meta<typeof MaskedInput> = { title: 'Components/Form/MaskedInput', component: MaskedInput, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const CPF: Story = { args: { mask: '999.999.999-99', placeholder: 'CPF' } };
export const Phone: Story = { args: { mask: '(99) 99999-9999', placeholder: 'Telefone' } };
export const Date: Story = { args: { mask: '99/99/9999', placeholder: 'Data' } };
