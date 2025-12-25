import type { Meta, StoryObj } from "@storybook/react";
import { CameraCard } from "./CameraCard";

const meta: Meta<typeof CameraCard> = {
  title: "Components/CameraCard",
  component: CameraCard,
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
        story: "Variant of CameraCard",
      },
    },
  },
};
