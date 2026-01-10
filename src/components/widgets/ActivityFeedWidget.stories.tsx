import type { Meta, StoryObj } from '@storybook/react';
import { ActivityFeedWidget } from './ActivityFeedWidget';

const meta: Meta<typeof ActivityFeedWidget> = { title: 'Widgets/ActivityFeedWidget', component: ActivityFeedWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof ActivityFeedWidget>;
export const Default: Story = {};

