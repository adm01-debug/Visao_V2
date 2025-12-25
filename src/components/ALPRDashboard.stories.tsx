import type { Meta, StoryObj } from "@storybook/react";
import { ALPRDashboard } from "./ALPRDashboard";

const meta: Meta<typeof ALPRDashboard> = {
  title: "Components/ALPRDashboard",
  component: ALPRDashboard,
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
        story: "Variant of ALPRDashboard",
      },
    },
  },
};
