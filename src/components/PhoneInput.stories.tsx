import type { Meta, StoryObj } from '@storybook/react';
import { PhoneInput } from './PhoneInput';
const meta: Meta<typeof PhoneInput> = { title: 'Components/Form/PhoneInput', component: PhoneInput, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { placeholder: 'Telefone' } };
export const Brazil: Story = { args: { country: 'BR', value: '+5511999999999' } };
