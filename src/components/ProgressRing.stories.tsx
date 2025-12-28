import type { Meta, StoryObj } from '@storybook/react';
import { ProgressRing } from './ProgressRing';
const meta: Meta<typeof ProgressRing> = { title: 'Components/Feedback/ProgressRing', component: ProgressRing, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { progress: 75 } };
export const Complete: Story = { args: { progress: 100 } };
export const Small: Story = { args: { progress: 50, size: 40 } };
