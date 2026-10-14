---
name: js-performance-optimization
description: Specialist in JavaScript performance, modular architecture, surgical DOM diffing, event listener lifecycle, memory leak prevention, and LuCI RPC batching for OpenWrt.
---

# ARK Router: JavaScript Performance, Modular Architecture & Optimization

## Objetivo
Orientar o desenvolvimento, modularização, auditoria e otimização de código JavaScript no ecossistema do **ARK Router** e **LuCI (OpenWrt)**. Garante alta performance em dispositivos modestos (CPUs embarcadas MIPS/ARM e smartphones de entrada), previne vazamentos de memória (*memory leaks*), elimina pausas de *Garbage Collection (GC jank)* e organiza a base de código para manutenção fácil e segura sem quebrar a compatibilidade com o LuCI.

---

## 1. Arquitetura Modular vs. Monólito: A Regra de Ouro

O LuCI espera que uma tela (view) seja entregue como um módulo AMD único (ex: `equipe-dashboard/overview.js`), o que historicamente levou à concentração de dezenas de milhares de linhas em um único arquivo monólito.

### Diretriz Canônica de Edição:
1. **NUNCA edite o monólito compilado diretamente** (`root/www/.../overview.js` ou `overview_v2.js` em produção).
2. Todo código-fonte deve ser mantido estritamente dividido em `src/`:
   - `src/core/`: Infraestrutura básica (RPC, formatação, constantes, i18n, helpers).
   - `src/modules/`: Módulos de domínio independentes (`network.js`, `wifi.js`, `system.js`, `devices.js`, etc.) exportando métodos isolados (`Object.assign`).
3. **Pipeline Automatizado**:
   - As alterações em `src/` são agregadas pelo script `scripts/build_frontend_bundle.py` e minificadas por `scripts/build_minified_assets.py`.
   - Cada módulo em `src/modules/` DEVE ter menos de **2.000 linhas**, mantendo alta coesão e baixo acoplamento.

---

## 2. Técnicas de DOM Diffing Cirúrgico (Eliminando o Garbage Collection Jank)

No ARK Router, o dashboard atualiza métricas e status a cada **5 segundos** (ciclo de polling).

### O Erro Comum (Destruição Total do DOM):
```javascript
// ❌ PÉSSIMO: Destrói nós, força reflow total e gera lixo de memória para o GC a cada 5s
function updateStatus(container, data) {
    container.innerHTML = '';
    container.appendChild(E('div', { class: 'status-pill' }, data.status));
}
```

### A Abordagem Otimizada (Surgical DOM Mutation):
```javascript
// ✅ EXCELENTE: Reutiliza o nó existente e só altera o texto/classe necessária
function updateStatus(container, data) {
    let pill = container.querySelector('.status-pill');
    if (!pill) {
        pill = E('div', { class: 'status-pill' });
        container.appendChild(pill);
    }
    
    // Atualiza apenas o texto se tiver mudado
    if (pill.textContent !== data.status) {
        pill.textContent = data.status;
    }
    
    // Alterna classes sem disparar reflow desnecessário
    pill.classList.toggle('online', data.isOnline);
    pill.classList.toggle('offline', !data.isOnline);
}
```

### Regras de Ouro de Renderização:
- **`DocumentFragment`:** Ao inserir múltiplos novos nós no DOM (ex: lista de novos dispositivos), sempre anexe-os primeiro a um `document.createDocumentFragment()` e faça um único `.appendChild()` no DOM vivo.
- **Evitar Layout Thrashing:** NUNCA intercale leituras de geometria (`offsetHeight`, `clientWidth`, `getBoundingClientRect()`) com escritas de estilos (`style.height = ...`). Faça todas as leituras primeiro, calcule os valores e aplique todas as escritas juntas.

---

## 3. Gerenciamento do Ciclo de Vida de Event Listeners com `AbortController`

A principal causa de vazamento de memória (*memory leaks*) e lentidão progressiva em Single Page Apps no LuCI é o acúmulo de *event listeners* em modais e botões dinâmicos que são abertos e fechados repetidamente.

### Padrão Obrigatório com `AbortController`:
```javascript
// ✅ EXCELENTE: Descarte limpo e atômico de dezenas de listeners com 1 linha
function openInterfaceModal(interfaceName) {
    const abortCtrl = new AbortController();
    const { signal } = abortCtrl;
    
    const modalEl = document.querySelector('#modal_edit_iface');
    
    // Registra todos os listeners passando o signal
    modalEl.querySelector('.btn-save').addEventListener('click', () => {
        saveInterface(interfaceName);
    }, { signal });
    
    modalEl.querySelector('.input-ip').addEventListener('input', (e) => {
        validateIP(e.target.value);
    }, { signal });
    
    // Ao fechar ou destruir o modal, limpa TODOS os listeners instantaneamente da memória
    function cleanup() {
        abortCtrl.abort(); // Remove todos os listeners vinculados ao signal
        modalEl.remove();
    }
    
    modalEl.querySelector('.btn-close').addEventListener('click', cleanup, { signal });
}
```

---

## 4. Otimização e Agrupamento de Chamadas LuCI RPC / UBUS

O servidor web do OpenWrt (`uhttpd`) possui limites estritos de conexões simultâneas e concorrência para economizar CPU e RAM do roteador.

### Diretrizes de Rede:
1. **Batching em Chamada Única:** Nunca dispare 6 chamadas HTTP individuais para endpoints RPC diferentes em paralelo. Use o mecanismo de lote (*batch array*) do LuCI RPC para enviar uma única requisição HTTP contendo todas as invocações.
2. **Cache de Dados Estáticos:** Informações que não mudam durante a sessão (modelo da CPU, arquitetura, memória Flash total, versão do firmware, nomes físicos de portas eth0-ethX) devem ser requisitadas **apenas uma vez** no `load()` da view e cacheadas em memória local.
3. **Respeito ao Modo Econômico:** Se a aba do navegador estiver em segundo plano (`document.hidden`), reduza a frequência do polling de 5s para 30s ou pause a atualização para poupar a CPU do roteador e a bateria do cliente:
   ```javascript
   document.addEventListener('visibilitychange', () => {
       if (document.hidden) {
           pollInterval = 30000;
       } else {
           pollInterval = 5000;
           triggerImmediatePoll();
       }
   });
   ```

---

## 5. Carregamento sob Demanda (Lazy Loading de Submódulos Pesados)

Recursos secundários ou de uso esporádico (ex: Teste de Velocidade *Speedtest*, telemetria avançada de antena *Starlink*, configurações complexas de *Speedify* ou *AdBlock*) não precisam ser compilados ou carregados na carga inicial do painel.

### Padrão de Dynamic Submodule:
1. Manter a casca do botão na Dashboard principal.
2. Ao clicar no botão, carregar o módulo dinamicamente via `L.require`:
   ```javascript
   openSpeedtestModal: function() {
       ui.showIndicator();
       L.require('view.equipe-dashboard.modules.speedtest').then((speedtestModule) => {
           ui.hideIndicator();
           speedtestModule.render(this);
       }).catch((err) => {
           ui.hideIndicator();
           ui.addNotification(null, E('p', {}, 'Erro ao carregar módulo Speedtest: ' + err.message));
       });
   }
   ```
3. **Resultado Prático:**
   - Redução de até 40% no tamanho do script inicial do dashboard.
   - Parse e compilação instantâneos no navegador mobile.

---

## 6. Pipeline de Minificação & Tree-Shaking para Produção

Ao compilar os arquivos para distribuição final (.ipk/.apk):
1. **Remoção de Logs e Debuggers:**
   Configurar o bundler (esbuild / terser) com:
   ```javascript
   drop: ['console', 'debugger'],
   minify: true,
   legalComments: 'none'
   ```
2. **Validação de Sintaxe Pré-Build:**
   Sempre executar validação de sintaxe estrita antes de commitar ou empacotar:
   ```bash
   node --check root/www/luci-static/resources/view/equipe-dashboard/overview.js
   ```
3. **Budget de Tamanho:**
   O bundle final minificado não deve ultrapassar **150 KB gzipped**, garantindo compatibilidade imediata com conexões lentas e armazenamento compacto em partições overlayfs de 16MB SPI Flash.
   - **Nota de Escopo de Orçamento**: O limite de **150 KB gzipped** aplica-se ao bundle completo da aplicação (`overview.js` + módulos), enquanto o script de tema global (`ark-theme.js`) deve respeitar o teto estrito de **60 KB** definido em `ark-theme-ui/SKILL.md`.
