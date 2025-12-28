import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingTour } from './OnboardingTour';
const meta: Meta<typeof OnboardingTour> = { title: 'Components/Onboarding/OnboardingTour', component: OnboardingTour, tags: ['autodocs'], parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { steps: [{ target: '.step1', content: 'Passo 1' }], run: true } };
