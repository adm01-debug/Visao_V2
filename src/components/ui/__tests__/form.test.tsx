import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../form';
import { Input } from '../input';

describe('Form', () => {
  const FormWrapper = () => {
    const form = useForm({ defaultValues: { name: '' } });
    return (
      <Form {...form}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormDescription>Your name</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      </Form>
    );
  };

  it('deve renderizar form', () => {
    render(<FormWrapper />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('deve exibir description', () => {
    render(<FormWrapper />);
    expect(screen.getByText('Your name')).toBeInTheDocument();
  });

  it('deve renderizar input', () => {
    render(<FormWrapper />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
