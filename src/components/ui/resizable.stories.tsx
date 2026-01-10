import type { Meta, StoryObj } from '@storybook/react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable';

const meta: Meta<typeof ResizablePanelGroup> = { title: 'UI/Resizable', component: ResizablePanelGroup, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof ResizablePanelGroup>;
export const Default: Story = {
  render: () => (
    <ResizablePanelGroup direction='horizontal' className='min-h-[200px] rounded-lg border'>
      <ResizablePanel defaultSize={50}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Painel 1</span>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <div className='flex h-full items-center justify-center p-6'>
          <span className='font-semibold'>Painel 2</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
};

