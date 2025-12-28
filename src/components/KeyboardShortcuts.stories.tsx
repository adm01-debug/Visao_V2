import type { Meta, StoryObj } from '@storybook/react';
import { KeyboardShortcuts } from './KeyboardShortcuts';
const meta: Meta<typeof KeyboardShortcuts> = { title: 'Components/Utility/KeyboardShortcuts', component: KeyboardShortcuts, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { shortcuts: [{ key: 'ctrl+k', action: 'search' }] } };
