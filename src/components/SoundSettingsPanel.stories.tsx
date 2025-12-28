import type { Meta, StoryObj } from '@storybook/react';
import { SoundSettingsPanel } from './SoundSettingsPanel';
const meta: Meta<typeof SoundSettingsPanel> = { title: 'Components/Settings/SoundSettingsPanel', component: SoundSettingsPanel, tags: ['autodocs'], parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const Muted: Story = { args: { muted: true } };
