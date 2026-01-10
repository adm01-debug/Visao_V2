import type { Meta, StoryObj } from '@storybook/react';
import { ProgressiveImage } from './ProgressiveImage';

const meta: Meta<typeof ProgressiveImage> = { title: 'UI/ProgressiveImage', component: ProgressiveImage, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof ProgressiveImage>;
export const Default: Story = {
  args: { src: 'https://via.placeholder.com/400', alt: 'Example' },
};

