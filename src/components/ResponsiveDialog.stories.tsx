import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveDialog } from "./ResponsiveDialog";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof ResponsiveDialog> = {
  title: "Components/ResponsiveDialog",
  component: ResponsiveDialog,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ResponsiveDialog>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    title: "Diálogo Responsivo",
    description: "Este diálogo se adapta a diferentes tamanhos de tela",
    children: <p className="py-4">Conteúdo do diálogo</p>,
  },
};

export const WithActions: Story = {
  args: {
    open: true,
    onOpenChange: () => {},
    title: "Confirmar Ação",
    description: "Tem certeza que deseja continuar?",
    children: (
      <div className="flex gap-2 pt-4">
        <Button variant="outline">Cancelar</Button>
        <Button>Confirmar</Button>
      </div>
    ),
  },
};

