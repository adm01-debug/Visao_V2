import type { Meta, StoryObj } from "@storybook/react";
import { Settings } from "./Settings";
const meta: Meta<typeof Settings> = { title: "Components/Settings", component: Settings, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
