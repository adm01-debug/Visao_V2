import type { Meta, StoryObj } from '@storybook/react';
import { WidgetWrapper } from './WidgetWrapper';

const meta: Meta<typeof WidgetWrapper> = { title: 'Widgets/WidgetWrapper', component: WidgetWrapper, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof WidgetWrapper>;
export const Default: Story = { args: { title: 'Widget', children: <div>Content</div> } };

