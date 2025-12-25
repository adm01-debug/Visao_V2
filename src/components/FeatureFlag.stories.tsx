import type { Meta, StoryObj } from "@storybook/react";
import { FeatureFlag } from "./FeatureFlag";
const meta: Meta<typeof FeatureFlag> = { title: "Components/FeatureFlag", component: FeatureFlag, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
