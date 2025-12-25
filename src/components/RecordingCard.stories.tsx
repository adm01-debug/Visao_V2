import type { Meta, StoryObj } from "@storybook/react";
import { RecordingCard } from "./RecordingCard";
const meta: Meta<typeof RecordingCard> = { title: "Components/RecordingCard", component: RecordingCard, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
