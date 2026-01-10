import type { Meta, StoryObj } from '@storybook/react';
import { PullToRefresh, InfiniteScroll } from './MobileInteractions';

const meta: Meta = { title: 'UI/MobileInteractions', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;
export const PullRefresh: Story = { render: () => <PullToRefresh onRefresh={() => Promise.resolve()}>Content</PullToRefresh> };

