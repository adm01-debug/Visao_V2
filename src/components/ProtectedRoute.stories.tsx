import type { Meta, StoryObj } from '@storybook/react';
import { ProtectedRoute } from './ProtectedRoute';
import { BrowserRouter } from 'react-router-dom';
const meta: Meta<typeof ProtectedRoute> = { title: 'Components/Auth/ProtectedRoute', component: ProtectedRoute, tags: ['autodocs'], decorators: [(Story) => <BrowserRouter><Story /></BrowserRouter>] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: <div>Conteúdo protegido</div> } };
