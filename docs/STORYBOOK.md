# 📚 Storybook Guide - Projeto VISÃO

## Visão Geral

Documentação e desenvolvimento de componentes com Storybook.

---

## 1. Executar

```bash
npm run storybook
# Abre em http://localhost:6006
```

---

## 2. Build

```bash
npm run build-storybook
# Output em storybook-static/
```

---

## 3. Estrutura de Story

```tsx
// ComponentName.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Components/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};
```

---

## 4. Cobertura

| Categoria | Stories | Cobertura |
|-----------|---------|-----------|
| Components | 276 | 100% |
| Hooks | - | N/A |
| Pages | - | N/A |

---

## 5. Addons Instalados

| Addon | Uso |
|-------|-----|
| @storybook/addon-essentials | Básicos |
| @storybook/addon-interactions | Testes |
| @storybook/addon-a11y | Acessibilidade |
| @storybook/addon-themes | Temas |

---

## 6. Decorators

```tsx
// .storybook/preview.tsx
export const decorators = [
  (Story) => (
    <ThemeProvider>
      <Story />
    </ThemeProvider>
  ),
];
```

---

## 7. Controls

```tsx
argTypes: {
  size: {
    control: { type: 'range', min: 10, max: 100 },
  },
  color: {
    control: 'color',
  },
  disabled: {
    control: 'boolean',
  },
},
```

---

## 8. Actions

```tsx
export const WithClick: Story = {
  args: {
    onClick: fn(),
  },
};
```

---

## 9. Play Functions (Testes)

```tsx
export const WithInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(canvas.getByText('Clicked!')).toBeInTheDocument();
  },
};
```

---

## 10. Acessibilidade

```tsx
// Verificar automaticamente
export const Accessible: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};
```

---

**Última atualização:** 06/01/2026
