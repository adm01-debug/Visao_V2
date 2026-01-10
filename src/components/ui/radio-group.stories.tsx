import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta: Meta<typeof RadioGroup> = { title: 'UI/RadioGroup', component: RadioGroup, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof RadioGroup>;
export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue='option-1'>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-1' id='option-1' />
        <Label htmlFor='option-1'>Opção 1</Label>
      </div>
      <div className='flex items-center space-x-2'>
        <RadioGroupItem value='option-2' id='option-2' />
        <Label htmlFor='option-2'>Opção 2</Label>
      </div>
    </RadioGroup>
  ),
};

