import type { Meta, StoryObj } from '@storybook/react';
import { Head } from './Head';
const meta: Meta<typeof Head> = { title: 'Components/SEO/Head', component: Head, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { title: 'VISÃO - Dashboard' } };
export const WithMeta: Story = { args: { title: 'VISÃO', description: 'Sistema de vigilância' } };
