import type { Meta, StoryObj } from "@storybook/react";
import { ObjectDetectionConfig } from "./ObjectDetectionConfig";
const meta: Meta<typeof ObjectDetectionConfig> = { title: "Components/ObjectDetectionConfig", component: ObjectDetectionConfig, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
