import type { Meta, StoryObj } from '@storybook/react';
import { TagsInput } from './TagsInput';
const meta: Meta<typeof TagsInput> = { title: 'Components/Form/TagsInput', component: TagsInput, tags: ['autodocs'], parameters: { layout: 'centered' } };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: {} };
export const WithTags: Story = { args: { value: ['tag1', 'tag2', 'tag3'] } };
