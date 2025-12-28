import type { Meta, StoryObj } from '@storybook/react';
import { SEO } from './SEO';
const meta: Meta<typeof SEO> = { title: 'Components/SEO/SEO', component: SEO, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { title: 'VISÃO', description: 'Sistema de vigilância inteligente' } };
