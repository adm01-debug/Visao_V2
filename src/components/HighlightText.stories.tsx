import type { Meta, StoryObj } from '@storybook/react';
import { HighlightText } from './HighlightText';
const meta: Meta<typeof HighlightText> = { title: 'Components/Display/HighlightText', component: HighlightText, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { text: 'Texto com destaque', highlight: 'destaque' } };
export const Multiple: Story = { args: { text: 'Múltiplos destaques aqui', highlight: ['Múltiplos', 'aqui'] } };
