import type { Meta, StoryObj } from "@storybook/react";
import { TelegramSettings } from "./TelegramSettings";
const meta: Meta<typeof TelegramSettings> = { title: "Components/TelegramSettings", component: TelegramSettings, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
