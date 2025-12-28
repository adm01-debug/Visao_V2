import type { Meta, StoryObj } from '@storybook/react';
import { Tour } from './Tour';
const meta: Meta<typeof Tour> = { title: 'Components/Onboarding/Tour', component: Tour, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { steps: [{ target: '.step1', content: 'Bem-vindo!' }], run: true } };
