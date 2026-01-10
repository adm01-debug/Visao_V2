import type { Meta, StoryObj } from '@storybook/react';
import { ModalProvider } from './ModalProvider';

const meta: Meta<typeof ModalProvider> = { title: 'UI/ModalProvider', component: ModalProvider, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof ModalProvider>;
export const Default: Story = { args: { children: <div>Modal context</div> } };

