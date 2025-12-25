import type { Meta, StoryObj } from "@storybook/react";
import { ImagePreview } from "./ImagePreview";
const meta: Meta<typeof ImagePreview> = { title: "Components/ImagePreview", component: ImagePreview, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
