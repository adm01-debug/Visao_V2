import type { Meta, StoryObj } from '@storybook/react';
import { NavLink } from './NavLink';
import { BrowserRouter } from 'react-router-dom';
const meta: Meta<typeof NavLink> = { title: 'Components/Navigation/NavLink', component: NavLink, tags: ['autodocs'], decorators: [(Story) => <BrowserRouter><Story /></BrowserRouter>] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { to: '/dashboard', children: 'Dashboard' } };
export const Active: Story = { args: { to: '/', children: 'Home' } };
