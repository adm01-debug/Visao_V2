import type { Meta, StoryObj } from '@storybook/react';
import { FloorPlanMap } from './FloorPlanMap';

const meta: Meta<typeof FloorPlanMap> = {
  title: 'Components/Maps/FloorPlanMap',
  component: FloorPlanMap,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Mapa de planta baixa com posicionamento de câmeras.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const WithCameras: Story = { args: { cameras: [{ id: '1', x: 100, y: 100, name: 'Cam 1' }] } };
export const WithZones: Story = { args: { zones: [{ id: '1', points: [[0,0],[100,0],[100,100],[0,100]], name: 'Zona A' }] } };
