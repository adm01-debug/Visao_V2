import type { Meta, StoryObj } from '@storybook/react';
import { AddressAutocomplete } from './AddressAutocomplete';

const meta: Meta<typeof AddressAutocomplete> = {
  title: 'Components/Form/AddressAutocomplete',
  component: AddressAutocomplete,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Campo de entrada com autocomplete para endereços usando Google Places API.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: 'Digite o endereço...' } };
export const WithLabel: Story = { args: { label: 'Endereço', placeholder: 'Buscar endereço...' } };
export const WithValue: Story = { args: { value: 'Av. Paulista, 1000 - São Paulo, SP' } };
export const Disabled: Story = { args: { disabled: true, value: 'Endereço bloqueado' } };
