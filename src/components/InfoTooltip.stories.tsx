import type { Meta, StoryObj } from '@storybook/react';
import { InfoTooltip } from './InfoTooltip';
const meta: Meta<typeof InfoTooltip> = { title: 'Components/Feedback/InfoTooltip', component: InfoTooltip, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { content: 'Informação adicional' } };
export const WithTitle: Story = { args: { content: 'Detalhes', title: 'Ajuda' } };
