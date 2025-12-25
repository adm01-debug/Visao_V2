import type { Meta, StoryObj } from "@storybook/react";
import { Popover } from "./Popover";
const meta: Meta<typeof Popover> = { title: "Components/Popover", component: Popover, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
