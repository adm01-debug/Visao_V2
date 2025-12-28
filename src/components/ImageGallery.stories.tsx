import type { Meta, StoryObj } from '@storybook/react';
import { ImageGallery } from './ImageGallery';
const meta: Meta<typeof ImageGallery> = { title: 'Components/Media/ImageGallery', component: ImageGallery, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { images: [{ src: '/img1.jpg', alt: 'Img 1' }, { src: '/img2.jpg', alt: 'Img 2' }] } };
export const Grid: Story = { args: { images: [{ src: '/img1.jpg' }], layout: 'grid' } };
