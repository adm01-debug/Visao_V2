import type { Meta, StoryObj } from "@storybook/react";
import { MainLayout } from "./MainLayout";
const meta: Meta<typeof MainLayout> = { title: "Layout/MainLayout", component: MainLayout, parameters: { layout: "fullscreen" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof MainLayout>;
export const Default: Story = { args: { children: <div className="p-4">Conteúdo</div> } };
