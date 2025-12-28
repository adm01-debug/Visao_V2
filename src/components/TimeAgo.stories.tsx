import type { Meta, StoryObj } from '@storybook/react';
import { TimeAgo } from './TimeAgo';
const meta: Meta<typeof TimeAgo> = { title: 'Components/Display/TimeAgo', component: TimeAgo, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const JustNow: Story = { args: { date: new Date() } };
export const MinutesAgo: Story = { args: { date: new Date(Date.now() - 5 * 60000) } };
export const HoursAgo: Story = { args: { date: new Date(Date.now() - 3 * 3600000) } };
