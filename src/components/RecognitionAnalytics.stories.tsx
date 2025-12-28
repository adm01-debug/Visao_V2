import type { Meta, StoryObj } from '@storybook/react';
import { RecognitionAnalytics } from './RecognitionAnalytics';
const meta: Meta<typeof RecognitionAnalytics> = { title: 'Components/Analytics/RecognitionAnalytics', component: RecognitionAnalytics, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithData: Story = { args: { data: { total: 100, recognized: 80, unknown: 20 } } };
