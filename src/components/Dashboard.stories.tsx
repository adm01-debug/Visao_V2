import type { Meta, StoryObj } from "@storybook/react";
import Dashboard from "./Dashboard";

const meta: Meta<typeof Dashboard> = {
  title: "Components/Dashboard",
  component: Dashboard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Dashboard>;

export const Default: Story = {};

export const Loading: Story = {
  parameters: {
    mockData: {
      isLoading: true,
    },
  },
};
