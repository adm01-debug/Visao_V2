import type { Meta, StoryObj } from "@storybook/react";
import { GlobalShortcutsProvider } from "./GlobalShortcutsProvider";

const meta: Meta<typeof GlobalShortcutsProvider> = {
  title: "Components/GlobalShortcutsProvider",
  component: GlobalShortcutsProvider,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GlobalShortcutsProvider>;

export const Default: Story = {
  args: {
    children: <div className="p-4 border">Pressione Ctrl+K para busca</div>,
  },
};

