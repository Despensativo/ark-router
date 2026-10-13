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

### Largura da área principal e componentes do LuCI

- Em desktop, `100vw` inclui a calha da barra de rolagem em alguns navegadores. Para uma área principal ao lado do menu, prefira uma largura relativa ao contêiner (`100%`) e confira se há scroll horizontal nas páginas nativas do LuCI.
- Descubra quantos rádios existem antes de montar cartões Wi-Fi; não presuma sempre 2,4 e 5 GHz. Evite modificar o DOM interno de componentes LuCI como `<cbi-dropdown>`.

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

### Carregamento e versões

- Gere a versão do bundle principal e dos arquivos de idioma a partir da mesma fonte. Teste idioma padrão e idiomas sob demanda em um navegador, inclusive após atualizar o pacote com arquivos antigos em cache.
- Evite carregar consultas caras e recursos opcionais antes da primeira renderização. Quando usar cache no navegador, defina quando ele expira ou é invalidado e teste o caso de versão divergente.

---

## 6. O Que NUNCA Fazer na Interface do ARK Router

- ❌ **NUNCA use `alert()`, `confirm()` ou `prompt()` síncronos:** Eles congelam o thread de eventos do LuCI e falham miseravelmente no Safari mobile e webviews. Use os modais assíncronos estilizados do ARK Router.
- ❌ **NUNCA defina larguras fixas em pixels (`width: 600px`):** Use sempre limites responsivos com porcentagens ou `max-width: 100%`.
- ❌ **NUNCA confie em preenchimento automático de senhas do LuCI:** O LuCI injeta inputs fictícios com `left: -100000px` para enganar o navegador; seus seletores de DOM devem ignorar esses elementos ocultos.

---

## 7. Padrão Arquitetural Homologado: Tabelas, Abas e Ações Mobile no LuCI

### 7.1 Contenção Estrita de Viewport e Scroll Horizontal
No LuCI, telas com tabelas nativas (`.cbi-tblsection`, rotas, wireless, regras de tráfego, DHCP) possuem largura intrínseca maior que a largura da tela de um smartphone (360px a 390px). Sem contenção rigorosa, a página infla a viewport do navegador para mais de 1.000px, quebrando a responsividade e gerando uma faixa vazia lateral.

**Regras Mandatórias de CSS (`cascade.css` & `mobile.css`):**
1. **Contenção Global de Viewport:**
   ```css
   #view, #maincontent {
       max-width: 100% !important;
       box-sizing: border-box !important;
   }
   ```
2. **Desbloqueio de Scroll em Abas Ativas (A Pegadinha do LuCI):**
   - O LuCI adiciona `[data-tab-active="true"]` aos painéis de abas ativas.
   - **NUNCA** aplique `overflow: visible !important` genérico em seletores de abas ativas, pois isso anula a contenção horizontal de tabelas filhas.
   - Aplique sempre a regra de alta especificidade com scroll lateral touch:
   ```css
   .cbi-section.cbi-tblsection,
   .cbi-tblsection[data-tab-active="true"],
   .cbi-section.cbi-tblsection[data-tab-active="true"],
   .cbi-section-node,
   .ark-table-responsive {
       display: block !important;
       overflow-x: auto !important;
       -webkit-overflow-scrolling: touch !important;
       max-width: 100% !important;
       box-sizing: border-box !important;
   }
   ```
3. **Dimensionamento de Tabelas Densas:**
   - Para evitar colunas esmagadas ou texto ilegível em telas móveis, as tabelas com rolagem horizontal interna devem ter largura mínima e padding compacto:
   ```css
   @media only screen and (max-width: 854px) {
       .cbi-section-table,
       .cbi-tblsection-table,
       .table {
           min-width: 650px; /* Garante legibilidade e layout tabular íntegro */
           font-size: 12px;
       }
       .cbi-section-table-cell,
       .cbi-section-table-titles th {
           padding: 8px 10px !important;
           white-space: nowrap;
       }
   }
   ```

### 7.2 Encapsulamento Dinâmico de Tabelas no JavaScript (`ark-theme.js`)
Tabelas nativas do LuCI inseridas diretamente sob `#view` (órfãs, como `#wifi_assoclist_table` em wireless) ou tabelas em abas devem ser encapsuladas e enriquecidas através de ganchos em `applyPageTransforms()`:
1. **Empacotamento em Cartão com Rolagem Suave:**
   - Detectar a tabela e envolvê-la em `.cbi-section.ark-assoclist-card` com container `.ark-table-responsive`.
2. **Aviso Visual Tátil (Swipe Hint):**
   - Inserir um indicador tátil acima da tabela para instruir o usuário de celular a deslizar para visualizar colunas ocultas:
   ```javascript
   const hint = E('div', { 'class': 'ark-table-swipe-hint' }, '↔ Deslize a tabela para ver métrica, detalhes e ações');
   ```
   Com estilo sutil em `mobile.css`: `font-size: 11px; color: var(--text-muted); opacity: 0.8; margin-bottom: 8px;`.
3. **Idempotência Estrita no DOM:**
   - Toda transformação deve verificar atributo de marcação (ex: `table.dataset.arkWrapped = 'true'`) para nunca duplicar elementos durante mutações do DOM ou refreshes do LuCI.

### 7.3 Barra de Ações Mobile Padronizada (`.cbi-page-actions`)
Em telas móveis (smartphones), os botões da barra inferior de salvar/descartar nunca devem ficar comprimidos em linha única nem estourar a tela.
- **Layout Homologado:**
  1. Botão Primário ("Salvar e Aplicar" / `cbi-button-apply`): 100% da largura na linha superior, com altura mínima de 44px e destaque visual.
  2. Botões Secundários ("Salvar" / `cbi-button-save` e "Descartar" / `cbi-button-reset`): Grade de duas colunas balanceada (50% / 50%) na linha inferior, com altura mínima de 42px.
- **Implementação CSS (`mobile.css`):**
  ```css
  @media only screen and (max-width: 854px) {
      .cbi-page-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 12px !important;
      }
      .cbi-page-actions .cbi-button-apply {
          flex: 1 1 100% !important;
          order: 1 !important;
          min-height: 44px !important;
      }
      .cbi-page-actions .cbi-button-save,
      .cbi-page-actions .cbi-button-reset {
          flex: 1 1 calc(50% - 4px) !important;
          order: 2 !important;
          min-height: 42px !important;
      }
  }
  ```
