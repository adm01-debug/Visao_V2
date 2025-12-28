import type { Meta, StoryObj } from '@storybook/react';
import { Spotlight } from './Spotlight';
const meta: Meta<typeof Spotlight> = { title: 'Components/Effects/Spotlight', component: Spotlight, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { active: true, target: '.target-element' } };
