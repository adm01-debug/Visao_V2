import type { Meta, StoryObj } from '@storybook/react';
import { CodeEditor } from './CodeEditor';

const meta: Meta<typeof CodeEditor> = {
  title: 'Components/Editor/CodeEditor',
  component: CodeEditor,
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: { component: 'Editor de código com syntax highlighting usando Monaco Editor.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { language: 'javascript', value: 'console.log("Hello World");' } };
export const TypeScript: Story = { args: { language: 'typescript', value: 'const greeting: string = "Hello";' } };
export const JSON: Story = { args: { language: 'json', value: '{\n  "name": "VISÃO",\n  "version": "2.0"\n}' } };
export const ReadOnly: Story = { args: { language: 'javascript', value: '// Código somente leitura', readOnly: true } };
