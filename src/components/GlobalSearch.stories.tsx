import type { Meta, StoryObj } from "@storybook/react";
import { GlobalSearch } from "./GlobalSearch";
const meta: Meta<typeof GlobalSearch> = { title: "Components/GlobalSearch", component: GlobalSearch, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof GlobalSearch>;
export const Default: Story = {};
