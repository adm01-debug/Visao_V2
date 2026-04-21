

## Plano: Correção de Build + Polish Visual Rumo ao 10/10

### Problema Atual
Erro de build: `@dnd-kit/utilities` não encontrado. Pacote necessário para widgets arrastáveis do dashboard.

### Tarefas de Correção

#### 1. Correção Imediata de Build (5 min)
- **Arquivo**: `package.json`
- **Ação**: Adicionar `"@dnd-kit/utilities": "^3.2.2"` às dependências
- **Verificação**: Executar `npm install && npx tsc --noEmit` para confirmar build limpo

#### 2. Alinhamento React/React-DOM (3 min)
- **Arquivo**: `package.json`
- **Ação**: Alinhar `react-dom` para `^18.3.1` (compatível com React 18.3.1)
- **Por quê**: Evitar warnings de mismatch de versão

#### 3. Verificação Visual Dashboard (Dark Mode) - 5 min
- **Viewport**: Desktop 1280x720
- **Rota**: `/dashboard`
- **Verificar**: 
  - Header com glow line superior
  - Stats cards com hover lift animation
  - Widgets com skeleton loading
  - Empty states animados

#### 4. Verificação Visual Dashboard (Light Mode) - 5 min
- **Ação**: Toggle tema para light
- **Verificar**: Mesmos elementos em modo claro
- **Validar**: Consistência de cores HSL tokens

#### 5. Verificação Busca Global (Ctrl+K) - 5 min
- **Viewport**: Desktop
- **Atalho**: Ctrl+K
- **Verificar**: 
  - Dialog de busca aparece corretamente
  - Resultados em dark e light mode
  - Animações de entrada/saída

#### 6. Verificação Empty States - 5 min
- **Rotas**: `/cameras`, `/alertas`, `/zonas` (se dados vazios)
- **Verificar**:
  - Ícones animados com pulse ring
  - Títulos e descrições legíveis
  - Botões de ação com ripple effect

#### 7. Verificação Mobile (375px) - 5 min
- **Viewport**: Mobile 375x812
- **Ação**: Toggle entre dark/light
- **Verificar**: 
  - Bottom nav com transições suaves
  - Ícones ativos corretamente
  - Header colapsado apropriadamente

#### 8. Verificação Sidebar Ripple Effect - 3 min
- **Desktop**: Categoria headers (Monitoramento, Segurança, etc.)
- **Verificar**: Efeito ripple ao expandir/colapsar categorias

### Critérios de Aceitação 10/10

| Elemento | Critério |
|----------|----------|
| **Header** | Glow line visível, botões com active:scale-95, backdrop-blur funcionando |
| **Empty States** | Animação spring/pulse, ícones em camadas, botões com ripple |
| **Search** | Focus ring, sugestões com hover state, transições smooth |
| **Dark/Light** | Tokens HSL consistentes, nenhum hex hardcoded |
| **Mobile** | Bottom nav ícones ativos, transições 300ms, sem overflow |

### Checklist de Qualidade Final
- [ ] Build zero erros (`tsc --noEmit`)
- [ ] Lighthouse Acessibilidade 100%
- [ ] Lighthouse Performance 95%+
- [ ] Animações 60fps no toggle tema
- [ ] Ripple effects visíveis em todos os botões interativos

### Tempo Estimado
**Total: ~30 minutos** (sequencial, uma tarefa por vez conforme preferência do usuário)

### Após Correção
Assim que o build estiver limpo, poderei executar a verificação visual completa em ambos os modos e confirmar que o polish está no nível 10/10.

