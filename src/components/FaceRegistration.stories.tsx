import type { Meta, StoryObj } from "@storybook/react";
import { FaceRegistration } from "./FaceRegistration";

const meta: Meta<typeof FaceRegistration> = {
  title: "Components/FaceRegistration",
  component: FaceRegistration,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
