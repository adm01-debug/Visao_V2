import type { Meta, StoryObj } from '@storybook/react';
import { RichTextEditor } from './RichTextEditor';
const meta: Meta<typeof RichTextEditor> = { title: 'Components/Editor/RichTextEditor', component: RichTextEditor, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithContent: Story = { args: { value: '<p>Texto formatado</p>' } };
