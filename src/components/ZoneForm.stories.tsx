import type { Meta, StoryObj } from "@storybook/react";
import { ZoneForm } from "./ZoneForm";
const meta: Meta<typeof ZoneForm> = { title: "Components/ZoneForm", component: ZoneForm, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
