import type { Meta, StoryObj } from "@storybook/react";
import { CameraForm } from "./CameraForm";

const meta: Meta<typeof CameraForm> = {
  title: "Components/CameraForm",
  component: CameraForm,
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
        story: "Variant of CameraForm",
      },
    },
  },
};
