import type { Meta, StoryObj } from "@storybook/react";
import { VehicleCard } from "./VehicleCard";
const meta: Meta<typeof VehicleCard> = { title: "Components/VehicleCard", component: VehicleCard, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
