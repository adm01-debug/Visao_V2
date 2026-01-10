import type { Meta, StoryObj } from '@storybook/react';
import { FadeIn, SlideIn, ScaleIn } from './MotionComponents';

const meta: Meta = { title: 'UI/MotionComponents', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;
export const Fade: Story = { render: () => <FadeIn>Fade In</FadeIn> };
export const Slide: Story = { render: () => <SlideIn>Slide In</SlideIn> };
export const Scale: Story = { render: () => <ScaleIn>Scale In</ScaleIn> };

