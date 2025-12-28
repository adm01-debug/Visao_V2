import type { Meta, StoryObj } from '@storybook/react';
import { ColorPickerAdvanced } from './ColorPickerAdvanced';

const meta: Meta<typeof ColorPickerAdvanced> = {
  title: 'Components/Form/ColorPickerAdvanced',
  component: ColorPickerAdvanced,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Seletor de cor avançado com suporte a RGB, HEX e HSL.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { value: '#3B82F6' } };
export const WithAlpha: Story = { args: { value: 'rgba(59, 130, 246, 0.5)', showAlpha: true } };
export const Presets: Story = { args: { value: '#EF4444', presets: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'] } };
