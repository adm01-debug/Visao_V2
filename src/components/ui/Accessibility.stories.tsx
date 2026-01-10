import type { Meta, StoryObj } from '@storybook/react';
import { SkipLink, FocusTrap } from './Accessibility';

const meta: Meta = { title: 'UI/Accessibility', tags: ['autodocs'] };
export default meta;
type Story = StoryObj;
export const SkipLinkDefault: Story = { render: () => <SkipLink href='#main'>Skip to content</SkipLink> };

