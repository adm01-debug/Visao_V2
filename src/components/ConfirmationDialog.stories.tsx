import type { Meta, StoryObj } from "@storybook/react";
import { ConfirmationDialog } from "./ConfirmationDialog";
const meta: Meta<typeof ConfirmationDialog> = { title: "Components/ConfirmationDialog", component: ConfirmationDialog, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
