import type { Meta, StoryObj } from "@storybook/react";
import { LazyImage } from "./LazyImage";

const meta: Meta<typeof LazyImage> = {
  title: "Components/LazyImage",
  component: LazyImage,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LazyImage>;

export const Default: Story = {
  args: {
    src: "https://picsum.photos/400/300",
    alt: "Random image",
  },
};

export const WithFallback: Story = {
  args: {
    src: "invalid-url",
    alt: "With fallback",
    fallback: "https://via.placeholder.com/400x300",
  },
};
