import type { Meta, StoryObj } from "@storybook/react";
import { NotificationSettings } from "./NotificationSettings";
const meta: Meta<typeof NotificationSettings> = { title: "Components/NotificationSettings", component: NotificationSettings, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
