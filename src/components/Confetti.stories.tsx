import type { Meta, StoryObj } from '@storybook/react';
import { Confetti } from './Confetti';

const meta: Meta<typeof Confetti> = {
  title: 'Components/Feedback/Confetti',
  component: Confetti,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Animação de confete para celebrações.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { active: true } };
export const CustomColors: Story = { args: { active: true, colors: ['#EF4444', '#F59E0B', '#10B981'] } };
export const HighDensity: Story = { args: { active: true, particleCount: 200 } };
