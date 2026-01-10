import type { Meta, StoryObj } from '@storybook/react';
import { TouchFeedback } from './TouchFeedback';

const meta: Meta<typeof TouchFeedback> = { title: 'UI/TouchFeedback', component: TouchFeedback, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof TouchFeedback>;
export const Default: Story = { args: { children: <button>Touch me</button> } };

