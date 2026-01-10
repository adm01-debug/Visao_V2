import type { Meta, StoryObj } from '@storybook/react';
import { WidgetCatalog } from './WidgetCatalog';

const meta: Meta<typeof WidgetCatalog> = { title: 'Widgets/WidgetCatalog', component: WidgetCatalog, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof WidgetCatalog>;
export const Default: Story = { args: { onSelectWidget: () => {} } };

