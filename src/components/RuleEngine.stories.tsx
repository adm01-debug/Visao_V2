import type { Meta, StoryObj } from "@storybook/react";
import { RuleEngine } from "./RuleEngine";
const meta: Meta<typeof RuleEngine> = { title: "Components/RuleEngine", component: RuleEngine, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
