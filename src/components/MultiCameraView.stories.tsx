import type { Meta, StoryObj } from "@storybook/react";
import { MultiCameraView } from "./MultiCameraView";
const meta: Meta<typeof MultiCameraView> = { title: "Components/MultiCameraView", component: MultiCameraView, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
