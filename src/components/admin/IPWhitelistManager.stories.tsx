import type { Meta, StoryObj } from '@storybook/react';
import { IPWhitelistManager } from './IPWhitelistManager';

const meta: Meta<typeof IPWhitelistManager> = { title: 'Admin/IPWhitelistManager', component: IPWhitelistManager, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof IPWhitelistManager>;
export const Default: Story = {};

