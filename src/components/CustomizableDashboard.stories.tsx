import type { Meta, StoryObj } from "@storybook/react";
import { CustomizableDashboard } from "./CustomizableDashboard";

const meta: Meta<typeof CustomizableDashboard> = {
  title: "Components/CustomizableDashboard",
  component: CustomizableDashboard,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CustomizableDashboard>;

export const Default: Story = {};

export const EditMode: Story = {
  args: { initialEditMode: true },
};

