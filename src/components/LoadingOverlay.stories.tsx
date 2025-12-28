import type { Meta, StoryObj } from '@storybook/react';
import { LoadingOverlay } from './LoadingOverlay';
const meta: Meta<typeof LoadingOverlay> = { title: 'Components/Feedback/LoadingOverlay', component: LoadingOverlay, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { visible: true } };
export const WithMessage: Story = { args: { visible: true, message: 'Carregando...' } };
