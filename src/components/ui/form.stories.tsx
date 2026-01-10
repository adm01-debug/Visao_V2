import type { Meta, StoryObj } from '@storybook/react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';
import { useForm } from 'react-hook-form';

const meta: Meta<typeof Form> = { title: 'UI/Form', component: Form, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Form>;

const FormExample = () => {
  const form = useForm({ defaultValues: { username: '' } });
  return (
    <Form {...form}>
      <form className='space-y-4'>
        <FormField control={form.control} name='username' render={({ field }) => (
          <FormItem>
            <FormLabel>Username</FormLabel>
            <FormControl>
              <Input placeholder='Digite...' {...field} />
            </FormControl>
            <FormDescription>Seu nome de usuário</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      </form>
    </Form>
  );
};

export const Default: Story = { render: () => <FormExample /> };

