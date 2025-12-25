import type { Meta, StoryObj } from "@storybook/react";
import { VehicleList } from "./VehicleList";
const meta: Meta<typeof VehicleList> = { title: "Components/VehicleList", component: VehicleList, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
