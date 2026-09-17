---
name: ark-theme-ui
description: Specialist in LuCI DOM architecture, ARK Router custom themes, mobile-first responsiveness, touch targets, modal backdrop decoupling, and esbuild asset minification.
---

# ARK Router: Theme, UI & Mobile Responsiveness Guidelines

## Objetivo
Orientar o desenvolvimento, refatoração e auditoria visual da interface web do ARK Router no LuCI (OpenWrt). Garante experiência fluida em dispositivos móveis, conformidade com o LuCI DOM, acessibilidade e respeito rígido ao orçamento de memória Flash (16 MB) e RAM.

---

## 1. Área de Toque & Experiência Mobile (Touch-First)

- **Altura Única Mínima de 40px:**
  - Todo botão (`.cbi-button`, `.btn`), switch, checkbox ou badge clicável DEVE ter altura útil mínima de **40px**:
    ```css
    .cbi-button, .btn, .btn-action, .ark-badge-btn {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
    }
    ```
- **Anti-Zoom e Prevenção de Seleção Indesejada:**
  - Em botões, cartões interativos e switches, aplicar:
    ```css
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    ```
  - Evita o zoom acidental de duplo toque comum no iOS Safari e Chrome Android.

---

## 2. Modais, Backdrop e Isolamento de Scroll no LuCI

### Desacoplamento Estrito de Backdrop e Cartão
- **Backdrop Fixo (`#modal_overlay`):**
  ```css
  #modal_overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100dvh;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
  }
  #modal_overlay.inactive {
      pointer-events: none;
      opacity: 0;
  }
  ```
- **Cartão do Modal (`.modal`, `.cbi-modal`):**
  - NUNCA aplicar larguras fixas ou margens diretamente no backdrop.
  - O cartão interno deve ter `max-width: calc(100vw - 32px)`, `max-height: calc(100dvh - 48px)`, e rolagem interna com `overflow-y: auto`.

### Isolamento de Rolagem (A Pegadinha do LuCI)
- No LuCI (temas Argon / Bootstrap), o `body` possui `overflow: hidden; height: 100vh;`.
- **Quem rola é o contêiner `.main-right`!**
- Ao abrir um modal ou o menu lateral móvel, trave a rolagem travando o elemento `.main-right`:
  ```javascript
  const mainRight = document.querySelector('.main-right');
  if (mainRight) {
      mainRight.style.setProperty('overflow', 'hidden', 'important');
      mainRight.style.setProperty('pointer-events', 'none', 'important');
  }
  ```
  Ao fechar o modal, remova as propriedades para restaurar a navegação.

---

## 3. Contenção Flex e Grid (Prevenção de Quebra de Layout)

- **Regra de Ouro do `min-width: 0`:**
  - Em filhos diretos de elementos com `display: flex` ou `display: grid`, SEMPRE declare `min-width: 0;`.
  - Sem isso, textos longos como **endereços MAC** (`AA:BB:CC:DD:EE:FF`), **IPv6** ou **Hostnames** empurram a tela horizontalmente e quebram a responsividade no celular:
    ```css
    .device-row, .grid-cell, .card-content {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    ```

---

## 4. Confirmação de Segurança em Ações Críticas (Safety Interception)

- Ações que possam interromper a conexão (Reboot, Factory Reset, Sysupgrade, mudança de perfil de firewall):
  1. **Fase de Captura Obrigatória:** Usar `addEventListener('click', handler, true)` para interceptar o clique antes de qualquer manipulador interno do LuCI ou submissão acidental de formulário.
  2. **Trava Visual com Countdown:** O botão final de confirmação deve permanecer desabilitado por pelo menos 2 segundos exibindo um contador regressivo (`"Confirmar (2s)..."`).
  3. **Validação Backend:** O disparo real da ação deve enviar um token efêmero gerado e validado em `/tmp` (RAM).

---

## 5. Pipeline de Assets & Minificação (Zero-Waste no Overlay)

- **Código-Fonte vs Código de Produção:**
  - O código fonte de desenvolvimento em `root/www/...` permanece 100% legível, estruturado e comentado.
  - NUNCA suba arquivos sem minificar para o `/overlay` do roteador em produção.
- **Pipeline Automatizado (`scripts/build_minified_assets.py`):**
  - Gera os assets minificados via `esbuild` (`--minify --legal-comments=none`).
  - Validação de sintaxe JS com `node --check`.
  - Redução média de 60% a 70% no tamanho dos arquivos, preservando a partição `/overlay` acima de 2 MB livres.
- **Orçamento de Peso:**
  - O bundle combinado de CSS + JS do tema nunca deve exceder **60 KB** compactado (SquashFS).
  - Proibido importar bibliotecas pesadas de npm (Lodash, jQuery, React, Moment.js). O LuCI roda em vanilla JavaScript.

---

## 6. O Que NUNCA Fazer na Interface do ARK Router

- ❌ **NUNCA use `alert()`, `confirm()` ou `prompt()` síncronos:** Eles congelam o thread de eventos do LuCI e falham miseravelmente no Safari mobile e webviews. Use os modais assíncronos estilizados do ARK Router.
- ❌ **NUNCA defina larguras fixas em pixels (`width: 600px`):** Use sempre limites responsivos com porcentagens ou `max-width: 100%`.
- ❌ **NUNCA confie em preenchimento automático de senhas do LuCI:** O LuCI injeta inputs fictícios com `left: -100000px` para enganar o navegador; seus seletores de DOM devem ignorar esses elementos ocultos.
