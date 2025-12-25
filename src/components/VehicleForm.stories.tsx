import type { Meta, StoryObj } from "@storybook/react";
import { VehicleForm } from "./VehicleForm";
const meta: Meta<typeof VehicleForm> = { title: "Components/VehicleForm", component: VehicleForm, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
