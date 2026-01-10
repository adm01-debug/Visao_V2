import type { Meta, StoryObj } from '@storybook/react';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from './navigation-menu';

const meta: Meta<typeof NavigationMenu> = { title: 'UI/NavigationMenu', component: NavigationMenu, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<typeof NavigationMenu>;
export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Item 1</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='p-4'>
              <li>Subitem 1</li>
              <li>Subitem 2</li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

