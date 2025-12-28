import type { Meta, StoryObj } from '@storybook/react';
import { KeyValue } from './KeyValue';
const meta: Meta<typeof KeyValue> = { title: 'Components/Display/KeyValue', component: KeyValue, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { label: 'Status', value: 'Ativo' } };
export const WithIcon: Story = { args: { label: 'Câmera', value: 'Online', icon: 'Camera' } };
