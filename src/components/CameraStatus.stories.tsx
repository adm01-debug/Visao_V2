import type { Meta, StoryObj } from "@storybook/react";
import { CameraStatus } from "./CameraStatus";
const meta: Meta<typeof CameraStatus> = { title: "Components/CameraStatus", component: CameraStatus, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
