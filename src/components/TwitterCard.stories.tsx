import type { Meta, StoryObj } from '@storybook/react';
import { TwitterCard } from './TwitterCard';
const meta: Meta<typeof TwitterCard> = { title: 'Components/SEO/TwitterCard', component: TwitterCard, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { title: 'VISÃO', description: 'Sistema de vigilância' } };
export const Summary: Story = { args: { title: 'VISÃO', card: 'summary' } };
