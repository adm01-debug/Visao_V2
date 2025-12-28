import type { Meta, StoryObj } from '@storybook/react';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
const meta: Meta<typeof KeyboardShortcutsHelp> = { title: 'Components/Help/KeyboardShortcutsHelp', component: KeyboardShortcutsHelp, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { open: true } };
