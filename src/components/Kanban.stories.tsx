import type { Meta, StoryObj } from '@storybook/react';
import { Kanban } from './Kanban';
const meta: Meta<typeof Kanban> = { title: 'Components/Display/Kanban', component: Kanban, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { columns: [{ id: '1', title: 'A Fazer', items: [] }, { id: '2', title: 'Feito', items: [] }] } };
