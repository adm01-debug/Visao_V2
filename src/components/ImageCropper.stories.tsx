import type { Meta, StoryObj } from '@storybook/react';
import { ImageCropper } from './ImageCropper';
const meta: Meta<typeof ImageCropper> = { title: 'Components/Media/ImageCropper', component: ImageCropper, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { src: '/placeholder.jpg' } };
export const Square: Story = { args: { src: '/placeholder.jpg', aspect: 1 } };
export const Wide: Story = { args: { src: '/placeholder.jpg', aspect: 16/9 } };
