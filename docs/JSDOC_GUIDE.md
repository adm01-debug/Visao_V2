# 📝 Guia de Documentação JSDoc

Este documento estabelece padrões para documentação de código no projeto VIS-O.

## 🎯 Objetivo

Garantir que todo código esteja bem documentado para facilitar manutenção e onboarding de novos desenvolvedores.

---

## 📋 Padrões Obrigatórios

### Hooks

```typescript
/**
 * Hook para gerenciar autenticação do usuário
 * 
 * @description Gerencia estado de login, logout e sessão
 * @param options - Opções de configuração do hook
 * @param options.redirectUrl - URL para redirecionar após login
 * @param options.persistSession - Se deve persistir sessão no localStorage
 * @returns Estado de autenticação e funções de controle
 * 
 * @example
 * const { user, login, logout, isLoading } = useAuth({
 *   redirectUrl: '/dashboard',
 *   persistSession: true
 * });
 */
export function useAuth(options?: AuthOptions): AuthState {
  // implementação
}
```

### Componentes

```typescript
/**
 * Card de exibição de alerta
 * 
 * @description Exibe informações de um alerta com ações disponíveis
 * @param props - Props do componente
 * @param props.alert - Dados do alerta
 * @param props.onDismiss - Callback ao dispensar alerta
 * @param props.onAction - Callback ao executar ação
 * 
 * @example
 * <AlertCard 
 *   alert={alertData}
 *   onDismiss={handleDismiss}
 *   onAction={handleAction}
 * />
 */
export function AlertCard({ alert, onDismiss, onAction }: AlertCardProps) {
  // implementação
}
```

### Funções Utilitárias

```typescript
/**
 * Formata data para exibição localizada
 * 
 * @param date - Data a ser formatada
 * @param format - Formato desejado (default: 'PP')
 * @param locale - Locale para formatação (default: 'pt-BR')
 * @returns String formatada da data
 * @throws {Error} Se a data for inválida
 * 
 * @example
 * formatDate(new Date(), 'PPP', 'pt-BR')
 * // => "10 de janeiro de 2026"
 */
export function formatDate(
  date: Date | string,
  format = 'PP',
  locale = 'pt-BR'
): string {
  // implementação
}
```

### Types e Interfaces

```typescript
/**
 * Representa um alerta do sistema
 * @interface Alert
 */
export interface Alert {
  /** Identificador único do alerta */
  id: string;
  /** Tipo do alerta */
  type: AlertType;
  /** Severidade do alerta */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Mensagem do alerta */
  message: string;
  /** Data de criação */
  createdAt: Date;
  /** Se o alerta foi lido */
  read: boolean;
  /** Metadados adicionais */
  metadata?: Record<string, unknown>;
}
```

---

## 🏷️ Tags JSDoc Obrigatórias

| Tag | Uso | Obrigatório |
|-----|-----|-------------|
| `@description` | Descrição detalhada | Sim |
| `@param` | Parâmetros da função | Sim (se houver) |
| `@returns` | Valor de retorno | Sim (se retornar) |
| `@example` | Exemplo de uso | Recomendado |
| `@throws` | Exceções lançadas | Se aplicável |
| `@deprecated` | Código obsoleto | Se aplicável |
| `@see` | Referências | Se aplicável |

---

## ✅ Checklist de Documentação

- [ ] Todos os hooks exportados têm JSDoc
- [ ] Todos os componentes públicos têm JSDoc
- [ ] Todas as funções utilitárias têm JSDoc
- [ ] Todas as interfaces/types têm JSDoc
- [ ] Exemplos de uso estão incluídos
- [ ] Parâmetros estão documentados
- [ ] Retornos estão documentados

---

*Documento criado como parte do Sprint 6 de Documentação*
