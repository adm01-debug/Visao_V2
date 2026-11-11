import type { Meta, StoryObj } from '@storybook/react';
import { WidgetRenderer } from './WidgetRenderer';

const meta: Meta<typeof WidgetRenderer> = {
  title: 'Widgets/WidgetRenderer',
  component: WidgetRenderer,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof WidgetRenderer>;
export const Default: Story = {
  args: {
    widget: {
      id: 'stats-1',
      widgetId: 'stats-overview',
      type: 'stats-overview',
      position: { x: 0, y: 0 },
      size: { cols: 2, rows: 1 },
    },
    isEditing: false,
    onRemove: () => {},
    onResize: () => {},
  },
};
