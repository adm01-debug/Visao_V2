import type { Meta, StoryObj } from "@storybook/react";
import { AlertDetail } from "./AlertDetail";
const meta: Meta<typeof AlertDetail> = { title: "Components/AlertDetail", component: AlertDetail, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
