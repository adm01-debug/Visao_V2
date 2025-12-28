import type { Meta, StoryObj } from '@storybook/react';
import { LazyComponent } from './LazyComponent';
const meta: Meta<typeof LazyComponent> = { title: 'Components/Utility/LazyComponent', component: LazyComponent, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: <div>Conteúdo lazy</div> } };
