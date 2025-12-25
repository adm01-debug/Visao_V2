import type { Meta, StoryObj } from "@storybook/react";
import { AlertFilters } from "./AlertFilters";

const meta: Meta<typeof AlertFilters> = {
  title: "Components/AlertFilters",
  component: AlertFilters,
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
        story: "Variant of AlertFilters",
      },
    },
  },
};
