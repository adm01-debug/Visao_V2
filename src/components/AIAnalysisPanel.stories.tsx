import type { Meta, StoryObj } from "@storybook/react";
import { AIAnalysisPanel } from "./AIAnalysisPanel";

const meta: Meta<typeof AIAnalysisPanel> = {
  title: "Components/AIAnalysisPanel",
  component: AIAnalysisPanel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Variant: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "Variant of AIAnalysisPanel",
      },
    },
  },
};
