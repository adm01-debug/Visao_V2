import type { Meta, StoryObj } from '@storybook/react';
import { EnhancedWidgetCatalog } from './EnhancedWidgetCatalog';

const meta: Meta<typeof EnhancedWidgetCatalog> = { title: 'Widgets/EnhancedWidgetCatalog', component: EnhancedWidgetCatalog, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof EnhancedWidgetCatalog>;
export const Default: Story = { args: { onSelectWidget: () => {} } };

