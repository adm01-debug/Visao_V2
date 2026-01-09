import type { Meta, StoryObj } from "@storybook/react";
import { LazyLoad } from "./LazyLoad";
const meta: Meta<typeof LazyLoad> = { title: "Components/LazyLoad", component: LazyLoad, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof LazyLoad>;
export const Default: Story = {};
