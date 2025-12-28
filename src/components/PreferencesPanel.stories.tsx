import type { Meta, StoryObj } from '@storybook/react';
import { PreferencesPanel } from './PreferencesPanel';
const meta: Meta<typeof PreferencesPanel> = { title: 'Components/Settings/PreferencesPanel', component: PreferencesPanel, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const Open: Story = { args: { open: true } };
