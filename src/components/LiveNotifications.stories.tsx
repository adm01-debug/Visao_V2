import type { Meta, StoryObj } from "@storybook/react";
import { LiveNotifications } from "./LiveNotifications";
const meta: Meta<typeof LiveNotifications> = { title: "Components/LiveNotifications", component: LiveNotifications, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
