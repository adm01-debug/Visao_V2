import type { Meta, StoryObj } from '@storybook/react';
import { WordCloud } from './WordCloud';
const meta: Meta<typeof WordCloud> = { title: 'Components/Charts/WordCloud', component: WordCloud, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { words: [{ text: 'Alerta', value: 50 }, { text: 'Câmera', value: 30 }, { text: 'Segurança', value: 40 }] } };
