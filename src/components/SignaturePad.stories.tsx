import type { Meta, StoryObj } from '@storybook/react';
import { SignaturePad } from './SignaturePad';
const meta: Meta<typeof SignaturePad> = { title: 'Components/Form/SignaturePad', component: SignaturePad, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithBorder: Story = { args: { showBorder: true } };
