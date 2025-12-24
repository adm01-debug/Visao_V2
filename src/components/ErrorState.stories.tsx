import type { Meta, StoryObj } from "@storybook/react";
import ErrorState from "./ErrorState";

const meta: Meta<typeof ErrorState> = {
  title: "Components/ErrorState",
  component: ErrorState,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {
  args: {
    message: "Something went wrong",
  },
};

export const WithRetry: Story = {
  args: {
    message: "Failed to load data",
    onRetry: () => alert("Retrying..."),
  },
};

export const NotFound: Story = {
  args: {
    title: "404",
    message: "Page not found",
  },
};
