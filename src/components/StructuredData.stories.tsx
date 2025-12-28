import type { Meta, StoryObj } from '@storybook/react';
import { StructuredData } from './StructuredData';
const meta: Meta<typeof StructuredData> = { title: 'Components/SEO/StructuredData', component: StructuredData, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { type: 'WebApplication', data: { name: 'VISÃO' } } };
