import type { Meta, StoryObj } from '@storybook/react';
import { UserAvatar } from './UserAvatar';
const meta: Meta<typeof UserAvatar> = { title: 'Components/Display/UserAvatar', component: UserAvatar, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { name: 'João Silva' } };
export const WithImage: Story = { args: { name: 'Maria', src: '/avatar.jpg' } };
export const Small: Story = { args: { name: 'Pedro', size: 'sm' } };
export const Large: Story = { args: { name: 'Ana', size: 'lg' } };
