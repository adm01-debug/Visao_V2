import type { Meta, StoryObj } from '@storybook/react';
import { ScreenReaderOnly } from './ScreenReaderOnly';
const meta: Meta<typeof ScreenReaderOnly> = { title: 'Components/Accessibility/ScreenReaderOnly', component: ScreenReaderOnly, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: 'Texto apenas para leitores de tela' } };
