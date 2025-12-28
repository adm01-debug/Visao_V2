import type { Meta, StoryObj } from '@storybook/react';
import { PageWrapper } from './PageWrapper';
const meta: Meta<typeof PageWrapper> = { title: 'Components/Layout/PageWrapper', component: PageWrapper, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: <div>Conteúdo da página</div> } };
export const WithTitle: Story = { args: { title: 'Dashboard', children: <div>Conteúdo</div> } };
