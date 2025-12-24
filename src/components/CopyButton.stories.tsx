import type { Meta, StoryObj } from "@storybook/react";
import CopyButton from "./CopyButton";

const meta: Meta<typeof CopyButton> = {
  title: "Components/CopyButton",
  component: CopyButton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {
  args: {
    text: "Text to copy",
  },
};

export const WithLabel: Story = {
  args: {
    text: "Copy me!",
    label: "Copy",
  },
};
