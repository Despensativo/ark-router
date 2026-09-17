# Audit Accessibility (LuCI & ARK Theme)

## Overview
Checklist de acessibilidade e ergonomia visual para interfaces LuCI JavaScript SPA e tema ARK Router, focado em dispositivos móveis e conformidade WCAG 2.1 AA.

---

## Checklist de Verificação

### 1. Área de Toque & Mobile First
- [ ] **Touch Target Mínimo**: Todos os botões, switches, badges clicáveis e abas possuem `min-height: 40px` (ou `42px`).
- [ ] **Prevenção de Toque Acidental**: Aplicado `user-select: none; -webkit-tap-highlight-color: transparent;` em elementos de ação rápida.
- [ ] **Disposição em Celulares**: Botões de ação em rodapé de modais ocupam 50% de largura (`flex: 1 1 calc(50% - 8px)`).

### 2. Contraste & Legibilidade (Dark Theme)
- [ ] **Texto Principal**: Razão de contraste mínima de 4.5:1 contra o fundo escuro (`#0b0f19` / `#111827`).
- [ ] **Texto Secundário e Badges**: Contraste legível sem depender exclusivamente de cor para indicar status (usar ícones ou texto explícito junto com a cor).
- [ ] **Indicadores de Foco**: Foco visível (`outline` ou `ring`) ao navegar via teclado (`Tab`) em botões e campos de formulário.

### 3. Estrutura Semântica LuCI
- [ ] **Tabelas e Grids**: Suporte a tags semânticas e estrutura responsiva de divs do LuCI (`.table`, `.tr`, `.th`, `.td`).
- [ ] **Rótulos de Formulário**: Todos os inputs possuem `<label>` associado ou atributo `aria-label` descritivo.
- [ ] **Contenção Flexbox**: Filhos de flex/grid usam `min-width: 0` para evitar transbordamento horizontal com MACs ou URLs longas.

### 4. Modais e Interações Críticas
- [ ] **Isolamento de Scroll**: O contêiner `.main-right` é travado com `overflow: hidden !important` durante a exibição de modais.
- [ ] **Fase de Captura**: Ações críticas utilizam `addEventListener('click', handler, true)` e trava visual de 2 segundos.
- [ ] **Zero Diálogos Síncronos**: Proibido `alert()`, `confirm()` ou `prompt()`.
