import type { Meta, StoryObj } from "@storybook/react";
import { StatisticsCard } from "./StatisticsCard";
const meta: Meta<typeof StatisticsCard> = { title: "Components/StatisticsCard", component: StatisticsCard, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
