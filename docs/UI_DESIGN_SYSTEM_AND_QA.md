# Diretrizes de Design System e Matriz de QA Multi-Navegador

Este documento estabelece o padrão oficial de engenharia visual, contenção de layout e controle de qualidade (QA) do **ARK Router** para OpenWrt / LuCI.

---

## 1. Regras de Ouro de CSS & Box Model (Prevenção de Erros Básicos)

### 1.1 Contenção Universal de Caixas
1. **`box-sizing: border-box` Obrigatório**: Todo elemento, cartão, botão, input ou modal deve obrigatoriamente operar com `box-sizing: border-box`.
2. **Prevenção de Transbordamento em Flex/Grid (`min-width: 0`)**:
   * Em qualquer contêiner `display: flex` ou `display: grid`, todos os filhos diretos devem ter `min-width: 0`. Isso impede que textos longos, nomes de hosts, endereços MAC ou URLs empurrem a largura além do viewport do celular.
3. **Larguras Proporcionais e Fluidas**:
   * É proibido definir `width` fixo em pixels em contêineres principais sem um limite responsivo. Use sempre `width: 100%`, `max-width: ...`, ou `width: min(100%, 640px)`.
   * Em viewports móveis (`<= 600px`), contêineres devem respeitar `max-width: 100vw; overflow-x: hidden;`.

### 1.2 Regras Estritas para Modais e Overlays
1. **Desacoplamento entre Backdrop e Caixa do Modal**:
   * O backdrop escuro (`#modal_overlay`) é o contêiner de tela inteira (`position: fixed; inset: 0; width: 100vw; height: 100dvh`).
   * A caixa branca/escura interna (`.modal`, `.cbi-modal`) é o cartão de conteúdo.
   * **NUNCA** aplique `width: calc(100vw - 16px)` ou `margin: 8px auto` diretamente no seletor `#modal_overlay`. Isso reduz o tamanho do backdrop escuro, expondo a página de trás a toques diretos.
2. **Visibilidade Condicional de Overlays**:
   * `#modal_overlay` só deve existir na tela e interceptar toques quando a classe `body.modal-overlay-active` estiver presente.
   * Quando inativo: `pointer-events: none !important; opacity: 0 !important; display: none !important; left: -10000px !important;`.

---

## 2. Arquitetura de Rolagem no LuCI (Tema Argon / Bootstrap)

### 2.1 Quem Rola no LuCI?
* No tema Argon do LuCI, o `document.body` e o `window` **NÃO sofrem rolagem**. Eles possuem `height: 100vh; overflow: hidden;`.
* O contêiner que abriga todo o conteúdo e rola verticalmente é o **`<div class="main-right">`**.
* O menu lateral mobile fica em **`<div class="main-left">`**, acompanhado da máscara **`<div class="darkMask">`**.

### 2.2 Isolamento de Sub-Menu e Modais
Para impedir que a rolagem do menu lateral ou de um modal transfira o foco do gesto para o painel de trás:
1. **Menu Lateral Aberto (`.main-left.active`)**:
   * O fundo recebe:
     ```css
     .main-right.active,
     .darkMask.active ~ .main-right {
         overflow-y: hidden !important;
         pointer-events: none !important;
         touch-action: none !important;
         overscroll-behavior: none !important;
     }
     ```
   * O menu lateral recebe:
     ```css
     .main-left.active {
         pointer-events: auto !important;
         overscroll-behavior: contain !important;
         -webkit-overflow-scrolling: touch !important;
         touch-action: pan-y !important;
     }
     ```
2. **Modal Aberto (`body.modal-overlay-active`)**:
   * O fundo recebe `overflow-y: hidden !important; pointer-events: none !important;`.
   * O overlay recebe `pointer-events: auto !important; overflow-y: auto !important; overscroll-behavior: contain !important;`.

---

## 3. Botões, Toggles e Alvos de Toque no Mobile

1. **Área Mínima de Toque (Human Interface Guidelines)**:
   * Todo botão, switch ou link interativo no mobile deve ter no mínimo **40px de altura útil** (`min-height: 40px`).
2. **Prevenção de Zoom Acidental e Seleção de Texto**:
   * Botões de ação rápida e badges interativas devem ter `user-select: none; -webkit-tap-highlight-color: transparent;`.
3. **Distribuição em Duas Colunas no Modal**:
   * Em telas pequenas, os botões do rodapé de modais (`.modal .right`) devem ocupar 50% da largura em flexbox:
     ```css
     .modal .right .btn, .modal .right button {
         flex: 1 1 calc(50% - 8px) !important;
         min-height: 40px !important;
     }
     ```

---

## 4. Particularidades por Mecanismo de Navegador

| Mecanismo | Navegadores | Comportamento Crítico a Observar |
| :--- | :--- | :--- |
| **Blink** | Google Chrome, Microsoft Edge, Opera, Brave | Suporta `overscroll-behavior` perfeitamente. Obedece `pointer-events: none` instantaneamente. Renderiza sub-pixels de forma idêntica entre Desktop e Android. |
| **Gecko** | Mozilla Firefox | Possui barras de rolagem nativas que ocupam largura física (`scrollbar-gutter`). Exige `box-sizing: border-box` rigoroso e `scrollbar-width: thin` para não causar vazamento horizontal de 15px. |
| **WebKit** | Apple Safari (iOS / macOS / iPadOS) | **Não respeita** `overflow: hidden` no `body` se houver encadeamento de rolagem elástica (*rubber-banding*). Exige `overscroll-behavior: contain` e desativação explícita de `pointer-events` no contêiner irmão (`.main-right`). |

---

## 5. Matriz Automatizada de QA Pré-Deploy (`scripts/qa_visual_matrix.py`)

Todo deploy com alterações em CSS, templates ou visual deve obrigatoriamente executar a suíte automatizada:

```powershell
python scripts/qa_visual_matrix.py
```

### Ambientes e Resoluções Homologados:
1. **Chrome Desktop Full HD** (1920×1080)
2. **Chrome Laptop** (1366×768)
3. **Firefox Desktop Full HD** (1920×1080 - Motor Gecko)
4. **Edge Desktop Full HD** (1920×1080 - Motor Chromium)
5. **Chrome Mobile iPhone 14/15/16** (390×844 - Viewport WebKit iOS & Touch)
6. **Chrome Mobile Android Galaxy** (412×915 - Viewport Android High-DPI & Touch)
7. **Chrome Mobile Compact** (360×740 - Dispositivos de Entrada)
8. **Chrome Tablet / iPad** (768×1024 - Modo Tablet)

### Critérios de Aceite Automatizados:
* `hasDocOverflow == false`: Zero vazamento horizontal na página inteira.
* `hasMrOverflow == false`: Zero vazamento horizontal no contêiner `.main-right`.
* `brokenCount == 0`: Nenhum cartão, grid ou botão excede a largura da tela.
* `scrolled_y > 0`: Rolagem vertical nativa operando com fluidez.
* `mr_during_menu == 'hidden'`: Fundo 100% travado ao abrir o menu lateral.
* `mr_after_menu == 'auto'`: Fundo 100% destravado e restaurado ao fechar o menu lateral.
* Capturas de tela salvas em `docs/qa_screenshots/` para auditoria visual instantânea.
