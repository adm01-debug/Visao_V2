import type { Meta, StoryObj } from '@storybook/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';

const meta: Meta<typeof Dialog> = { title: 'UI/Dialog', component: Dialog, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof Dialog>;
export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline'>Abrir Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título do Dialog</DialogTitle>
          <DialogDescription>Descrição do dialog aqui.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

