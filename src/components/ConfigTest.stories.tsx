import type { Meta, StoryObj } from "@storybook/react";
import { ConfigTest } from "./ConfigTest";

const meta: Meta<typeof ConfigTest> = {
  title: "Components/ConfigTest",
  component: ConfigTest,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
