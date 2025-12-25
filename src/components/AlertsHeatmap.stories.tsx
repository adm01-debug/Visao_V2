import type { Meta, StoryObj } from "@storybook/react";
import { AlertsHeatmap } from "./AlertsHeatmap";

const meta: Meta<typeof AlertsHeatmap> = {
  title: "Components/AlertsHeatmap",
  component: AlertsHeatmap,
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
        story: "Variant of AlertsHeatmap",
      },
    },
  },
};
