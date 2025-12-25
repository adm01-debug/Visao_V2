import type { Meta, StoryObj } from "@storybook/react";
import { MapView } from "./MapView";
const meta: Meta<typeof MapView> = { title: "Components/MapView", component: MapView, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
