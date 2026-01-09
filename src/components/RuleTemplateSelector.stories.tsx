import type { Meta, StoryObj } from "@storybook/react";
import { RuleTemplateSelector } from "./RuleTemplateSelector";

const meta: Meta<typeof RuleTemplateSelector> = {
  title: "Components/RuleTemplateSelector",
  component: RuleTemplateSelector,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RuleTemplateSelector>;

export const Default: Story = {
  args: { onSelect: (t) => console.log("Selected:", t) },
};

