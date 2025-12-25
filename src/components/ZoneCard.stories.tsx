import type { Meta, StoryObj } from "@storybook/react";
import { ZoneCard } from "./ZoneCard";
const meta: Meta<typeof ZoneCard> = { title: "Components/ZoneCard", component: ZoneCard, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
