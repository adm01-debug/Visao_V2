import type { Meta, StoryObj } from '@storybook/react';
import { PageSkeletons } from './PageSkeletons';
const meta: Meta<typeof PageSkeletons> = { title: 'Components/Loading/PageSkeletons', component: PageSkeletons, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const Dashboard: Story = { args: { type: 'dashboard' } };
export const Table: Story = { args: { type: 'table' } };
