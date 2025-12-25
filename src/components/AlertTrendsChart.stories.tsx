import type { Meta, StoryObj } from "@storybook/react";
import { AlertTrendsChart } from "./AlertTrendsChart";

const meta: Meta<typeof AlertTrendsChart> = {
  title: "Components/AlertTrendsChart",
  component: AlertTrendsChart,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Variant: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "Variant of AlertTrendsChart",
      },
    },
  },
};
