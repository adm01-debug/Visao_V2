import type { Meta, StoryObj } from '@storybook/react';
import { ExportMenu } from './ExportMenu';

const meta: Meta<typeof ExportMenu> = {
  title: 'Components/Actions/ExportMenu',
  component: ExportMenu,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Menu de exportação com múltiplos formatos.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { formats: ['pdf', 'csv', 'xlsx'] } };
export const PDFOnly: Story = { args: { formats: ['pdf'] } };
export const WithData: Story = { args: { formats: ['csv', 'xlsx'], data: [{ name: 'Test', value: 1 }] } };
