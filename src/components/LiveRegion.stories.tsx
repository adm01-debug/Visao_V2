import type { Meta, StoryObj } from '@storybook/react';
import { LiveRegion } from './LiveRegion';
const meta: Meta<typeof LiveRegion> = { title: 'Components/Accessibility/LiveRegion', component: LiveRegion, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: 'Conteúdo dinâmico' } };
