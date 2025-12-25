import type { Meta, StoryObj } from "@storybook/react";
import { CameraGrid } from "./CameraGrid";

const meta: Meta<typeof CameraGrid> = {
  title: "Components/CameraGrid",
  component: CameraGrid,
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
        story: "Variant of CameraGrid",
      },
    },
  },
};
