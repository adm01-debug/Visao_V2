import type { Meta, StoryObj } from "@storybook/react";
import { SwipeableView } from "./SwipeableView";
const meta: Meta<typeof SwipeableView> = { title: "Components/SwipeableView", component: SwipeableView, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof SwipeableView>;
export const Default: Story = {};
