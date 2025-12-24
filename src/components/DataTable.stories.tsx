import type { Meta, StoryObj } from "@storybook/react";
import DataTable from "./DataTable";

const meta: Meta<typeof DataTable> = {
  title: "Components/DataTable",
  component: DataTable,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

export const Default: Story = {
  args: {
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
    ],
    data: [
      { id: 1, name: "Item 1", status: "Active" },
      { id: 2, name: "Item 2", status: "Inactive" },
    ],
  },
};

export const Empty: Story = {
  args: {
    columns: [{ key: "id", label: "ID" }],
    data: [],
  },
};
