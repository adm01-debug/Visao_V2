import type { Meta, StoryObj } from "@storybook/react";
import { OnboardingWizard } from "./OnboardingWizard";
const meta: Meta<typeof OnboardingWizard> = { title: "Components/OnboardingWizard", component: OnboardingWizard, parameters: { layout: "centered" }, tags: ["autodocs"] };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
