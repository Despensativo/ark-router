# ARK Router — Diretrizes de UI & LuCI

Documento modular para desenvolvimento e estilização de interfaces LuCI e temas do ARK Router.

---

## 1. Área de Toque & Usabilidade Mobile-First
- **Touch Target Mínimo**: Todo botão, badge clicável, switch ou item de menu interativo deve ter altura mínima útil de **40px** (`min-height: 40px`).
- **Anti-Zoom e Seleção**: Aplicar obrigatoriamente:
  ```css
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  ```
  em botões, cards e controles rápidos para evitar zoom no duplo toque e seleção acidental de texto em smartphones.

---

## 2. Modais, Diálogos e Confirmação de Segurança
- **Desacoplamento de Backdrop e Modal**:
  - O backdrop escuro (`#modal_overlay`) é fixo em tela inteira:
    ```css
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    pointer-events: none; /* quando inativo */
    ```
  - A caixa de diálogo (`.modal`, `.cbi-modal`) é o cartão central. **NUNCA** aplicar largura fixa em pixels ou margens externas diretamente em `#modal_overlay`.
- **Fase de Captura para Ações Críticas**:
  - Ações destrutivas (Reboot, Reset de fábrica, Flash de ROM, Troca de perfil WAN) DEVEM interceptar cliques na fase de captura:
    ```javascript
    element.addEventListener('click', handler, true);
    ```
    Isso impede submissão acidental de formulários do LuCI ou cliques concorrentes.
  - Trava visual obrigatória de 2 segundos no botão final com contador decrescente e token efêmero validado no backend (`/tmp`).

---

## 3. Isolamento de Scroll no LuCI
- No LuCI (temas Argon / Bootstrap), o elemento `body` possui `overflow: hidden; height: 100vh;`.
- **Quem rola a página é o contêiner `.main-right`**.
- Ao abrir modais, menus laterais ou alertas flutuantes, trave o contêiner `.main-right`:
  ```css
  .main-right.modal-open {
      overflow: hidden !important;
      pointer-events: none !important;
  }
  ```

---

## 4. Contenção Flexbox e Grid
- **Prevenção de Overflow Horizontal**:
  - Sempre aplicar `min-width: 0` em filhos diretos de `display: flex` e `display: grid`.
  - Isso garante que endereços MAC, hostnames longos, chaves SSH ou URLs não quebrem o layout em telas estreitas.

---

## 5. Práticas Proibidas (❌ O que NÃO fazer)
1. ❌ **Proibido usar diálogos nativos síncronos**: `alert()`, `confirm()` ou `prompt()`. Eles congelam a thread de eventos do LuCI, quebram chamadas RPC ubus e falham no mobile.
2. ❌ **Proibido largura fixa sem limite responsivo**: Evite `width: 600px` isolado; use sempre `max-width: 100%; width: min(600px, 92vw);`.
3. ❌ **Proibido confiar em autofill de senhas**: O LuCI injeta inputs fictícios (`left: -100000px`) que devem ser ignorados.
4. ❌ **Proibido subir código de desenvolvimento sem minificar**: Assets para o roteador devem sempre passar por `scripts/build_minified_assets.py`.
