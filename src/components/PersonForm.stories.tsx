import type { Meta, StoryObj } from "@storybook/react";
import { PersonForm } from "./PersonForm";
const meta: Meta<typeof PersonForm> = { title: "Components/PersonForm", component: PersonForm, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
