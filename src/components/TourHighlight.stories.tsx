import type { Meta, StoryObj } from '@storybook/react';
import { TourHighlight } from './TourHighlight';
const meta: Meta<typeof TourHighlight> = { title: 'Components/Onboarding/TourHighlight', component: TourHighlight, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { active: true, children: <button>Elemento destacado</button> } };
