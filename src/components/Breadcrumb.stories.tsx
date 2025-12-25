import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumb } from "./Breadcrumb";
const meta: Meta<typeof Breadcrumb> = { title: "Components/Breadcrumb", component: Breadcrumb, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
