import type { Meta, StoryObj } from '@storybook/react';
import { PeopleCountWidget } from './PeopleCountWidget';

const meta: Meta<typeof PeopleCountWidget> = { title: 'Widgets/PeopleCountWidget', component: PeopleCountWidget, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof PeopleCountWidget>;
export const Default: Story = {};

