import type { Meta, StoryObj } from '@storybook/react';
import { Meta as MetaComponent } from './Meta';
const meta: Meta<typeof MetaComponent> = { title: 'Components/SEO/Meta', component: MetaComponent, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { title: 'VISÃO', description: 'Sistema de vigilância' } };
