import type { Meta, StoryObj } from "@storybook/react";
import CountUp from "./CountUp";

const meta: Meta<typeof CountUp> = {
  title: "Components/CountUp",
  component: CountUp,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CountUp>;

export const Default: Story = {
  args: {
    end: 100,
    duration: 2,
  },
};

export const WithPrefix: Story = {
  args: {
    end: 1000,
    prefix: "$",
    duration: 2.5,
  },
};

export const WithSuffix: Story = {
  args: {
    end: 95,
    suffix: "%",
    duration: 1.5,
  },
};
