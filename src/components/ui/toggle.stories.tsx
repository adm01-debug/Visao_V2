import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from './toggle';

const meta: Meta<typeof Toggle> = { title: 'UI/Toggle', component: Toggle, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Toggle>;
export const Default: Story = { args: { children: 'Toggle' } };
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };

