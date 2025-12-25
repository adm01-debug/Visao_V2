import type { Meta, StoryObj } from "@storybook/react";
import { PersonList } from "./PersonList";
const meta: Meta<typeof PersonList> = { title: "Components/PersonList", component: PersonList, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
