import type { Meta, StoryObj } from '@storybook/react';
import { SwipeGesture, PinchGesture } from './GestureComponents';

const meta: Meta = { title: 'UI/GestureComponents', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;
export const Swipe: Story = { render: () => <SwipeGesture onSwipe={() => {}}>Swipe me</SwipeGesture> };

