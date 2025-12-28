import type { Meta, StoryObj } from '@storybook/react';
import { SeverityBadge } from './SeverityBadge';
const meta: Meta<typeof SeverityBadge> = { title: 'Components/Display/SeverityBadge', component: SeverityBadge, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Low: Story = { args: { severity: 'low' } };
export const Medium: Story = { args: { severity: 'medium' } };
export const High: Story = { args: { severity: 'high' } };
export const Critical: Story = { args: { severity: 'critical' } };
