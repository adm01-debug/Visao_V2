import type { Meta, StoryObj } from "@storybook/react";
import { AuthCallback } from "./AuthCallback";

const meta: Meta<typeof AuthCallback> = {
  title: "Components/AuthCallback",
  component: AuthCallback,
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
        story: "Variant of AuthCallback",
      },
    },
  },
};
