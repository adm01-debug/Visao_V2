import type { Meta, StoryObj } from "@storybook/react";
import { CameraSelector } from "./CameraSelector";

const meta: Meta<typeof CameraSelector> = {
  title: "Components/CameraSelector",
  component: CameraSelector,
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
        story: "Variant of CameraSelector",
      },
    },
  },
};
