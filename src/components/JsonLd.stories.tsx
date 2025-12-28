import type { Meta, StoryObj } from '@storybook/react';
import { JsonLd } from './JsonLd';
const meta: Meta<typeof JsonLd> = { title: 'Components/SEO/JsonLd', component: JsonLd, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { data: { '@type': 'WebApplication', name: 'VISÃO' } } };
