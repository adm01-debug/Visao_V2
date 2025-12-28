import type { Meta, StoryObj } from '@storybook/react';
import { HeatmapVisualization } from './HeatmapVisualization';

const meta: Meta<typeof HeatmapVisualization> = {
  title: 'Components/Charts/HeatmapVisualization',
  component: HeatmapVisualization,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Visualização de heatmap para análise de movimento.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithData: Story = { args: { data: [{ x: 100, y: 100, value: 0.8 }, { x: 200, y: 150, value: 0.5 }] } };
export const HighDensity: Story = { args: { radius: 30, blur: 15 } };
