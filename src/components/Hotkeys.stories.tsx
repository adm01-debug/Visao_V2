import type { Meta, StoryObj } from '@storybook/react';
import { Hotkeys } from './Hotkeys';
const meta: Meta<typeof Hotkeys> = { title: 'Components/Utility/Hotkeys', component: Hotkeys, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { keys: ['ctrl', 'k'], onPress: () => {} } };
