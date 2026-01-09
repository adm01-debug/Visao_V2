import type { Meta, StoryObj } from "@storybook/react";
import { AutomationRulesManager } from "./AutomationRulesManager";

const meta: Meta<typeof AutomationRulesManager> = {
  title: "Components/AutomationRulesManager",
  component: AutomationRulesManager,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AutomationRulesManager>;

export const Default: Story = {};

export const WithRules: Story = {
  parameters: {
    mockData: {
      rules: [
        { id: "1", name: "Detecção Movimento", is_active: true },
        { id: "2", name: "Alerta Perímetro", is_active: false },
      ],
    },
  },
};

