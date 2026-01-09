import type { Meta, StoryObj } from "@storybook/react";
import { PerformancePanel } from "./PerformancePanel";
const meta: Meta<typeof PerformancePanel> = { title: "Components/PerformancePanel", component: PerformancePanel, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof PerformancePanel>;
export const Default: Story = {};
