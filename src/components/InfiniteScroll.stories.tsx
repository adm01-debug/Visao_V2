import type { Meta, StoryObj } from '@storybook/react';
import { InfiniteScroll } from './InfiniteScroll';
const meta: Meta<typeof InfiniteScroll> = { title: 'Components/Utility/InfiniteScroll', component: InfiniteScroll, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { loadMore: () => {}, hasMore: true, children: <div>Items</div> } };
