import type { Meta, StoryObj } from '@storybook/react';
import { FeedbackWidget } from './FeedbackWidget';

const meta: Meta<typeof FeedbackWidget> = {
  title: 'Components/Feedback/FeedbackWidget',
  component: FeedbackWidget,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: 'Widget flutuante para coleta de feedback do usuário.' } } },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const Open: Story = { args: { defaultOpen: true } };
export const WithCategories: Story = { args: { categories: ['Bug', 'Sugestão', 'Dúvida'] } };
