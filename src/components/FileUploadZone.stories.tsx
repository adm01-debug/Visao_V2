import type { Meta, StoryObj } from '@storybook/react';
import { FileUploadZone } from './FileUploadZone';

const meta: Meta<typeof FileUploadZone> = {
  title: 'Components/Form/FileUploadZone',
  component: FileUploadZone,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: 'Zona de upload de arquivos com drag and drop.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const ImagesOnly: Story = { args: { accept: { 'image/*': ['.png', '.jpg', '.jpeg'] } } };
export const MultipleFiles: Story = { args: { multiple: true, maxFiles: 5 } };
export const WithMaxSize: Story = { args: { maxSize: 5 * 1024 * 1024 } };
