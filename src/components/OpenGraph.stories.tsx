import type { Meta, StoryObj } from '@storybook/react';
import { OpenGraph } from './OpenGraph';
const meta: Meta<typeof OpenGraph> = { title: 'Components/SEO/OpenGraph', component: OpenGraph, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { title: 'VISÃO', description: 'Sistema de vigilância', image: '/og-image.jpg' } };
