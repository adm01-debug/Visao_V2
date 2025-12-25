import type { Meta, StoryObj } from "@storybook/react";
import { PersonRegistration } from "./PersonRegistration";
const meta: Meta<typeof PersonRegistration> = { title: "Components/PersonRegistration", component: PersonRegistration, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
