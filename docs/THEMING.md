# 🎨 Theming Guide - Projeto VISÃO

## Visão Geral

Sistema de temas customizáveis com suporte a dark/light mode e cores personalizadas.

---

## 1. Temas Disponíveis

| Tema | Descrição |
|------|-----------|
| `light` | Tema claro padrão |
| `dark` | Tema escuro |
| `system` | Segue preferência do SO |

---

## 2. CSS Variables

### Cores Base

```css
:root {
  /* Background */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  
  /* Primary */
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  
  /* Secondary */
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  
  /* Muted */
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Accent */
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  
  /* Destructive */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  
  /* Border */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  
  /* Radius */
  --radius: 0.5rem;
}
```

### Dark Mode

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

---

## 3. Theme Provider

### Configuração

```tsx
import { ThemeProvider } from '@/contexts/ThemeContext';

<ThemeProvider defaultTheme="system" storageKey="visao-theme">
  <App />
</ThemeProvider>
```

### Hook

```typescript
import { useTheme } from '@/hooks/useDarkMode';

const { theme, setTheme, systemTheme } = useTheme();

// Alternar tema
setTheme('dark');
setTheme('light');
setTheme('system');
```

---

## 4. Cores de Status

| Status | Cor | Classe |
|--------|-----|--------|
| Success | Verde | `text-green-500` |
| Warning | Amarelo | `text-yellow-500` |
| Error | Vermelho | `text-red-500` |
| Info | Azul | `text-blue-500` |

### Componente Badge

```tsx
<Badge variant="success">Online</Badge>
<Badge variant="warning">Processando</Badge>
<Badge variant="destructive">Offline</Badge>
```

---

## 5. Cores de Alertas

| Severidade | Cor | HSL |
|------------|-----|-----|
| Critical | Vermelho | `0 84% 60%` |
| High | Laranja | `25 95% 53%` |
| Medium | Amarelo | `45 93% 47%` |
| Low | Azul | `210 79% 46%` |
| Info | Cinza | `215 16% 47%` |

---

## 6. Componentes Customizáveis

### Button Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Card Styles

```tsx
<Card className="border-l-4 border-l-green-500">
  Success Card
</Card>
```

---

## 7. Tailwind Config

```typescript
// tailwind.config.ts
export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... outros
      },
    },
  },
};
```

---

## 8. Acessibilidade

### Contraste

| Combinação | Ratio | Status |
|------------|-------|--------|
| Text/Background | 7:1 | ✅ AAA |
| Primary/Background | 4.5:1 | ✅ AA |
| Muted/Background | 3:1 | ✅ AA Large |

### Preferências do Usuário

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-contrast: high) {
  :root {
    --border: 0 0% 0%;
  }
}
```

---

**Última atualização:** 06/01/2026
