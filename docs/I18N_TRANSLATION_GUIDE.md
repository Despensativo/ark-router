# ARK Router — Guia de Internacionalização (i18n) e Catálogo de Tradução Pré-Release

## 1. Visão Geral e Filosofia Token-Efficient

O **ARK Router** suporta nativamente três idiomas: **Português do Brasil (PT-BR)**, **Inglês (EN)** e **Espanhol Neutro (ES)**.

Para equilibrar a experiência do usuário global com a máxima eficiência de desenvolvimento assistido por Inteligência Artificial (LLMs), o projeto adota a arquitetura **Single-Language Dev, Pre-Release Translation Gate**:

### O Problema do Desperdício de Tokens em Desenvolvimento Incremental
Durante o ciclo de criação, experimentação e refatoração de funcionalidades de rede:
- A interface é altamente volátil (nomes de botões mudam, kickers contextuais são reescritos, descrições de alertas são refinadas).
- Traduzir elemento por elemento ou tela por tela a cada commit queima dezenas de milhares de tokens da LLM manipulando arquivos de dicionário grandes (`en.js` e `es.js` possuem ~170 KB a 200 KB cada).
- Se uma funcionalidade experimental for descartada ou reestruturada, todos os tokens consumidos na tradução de suas strings intermediárias foram desperdiçados.

### A Solução Canônica: O Portão de Pré-Release (Pre-Release Gate)
1. **Fase de Desenvolvimento (100% PT-BR)**: Todo o código-fonte em `src/modules/` e `src/core/` é desenvolvido, testado e validado visualmente utilizando **exclusivamente o Português do Brasil**. Nenhuma tradução é gerada enquanto a funcionalidade estiver em prototipagem ou refatoração ativa.
2. **Fase de Congelamento e Pré-Release**: Imediatamente antes de empacotar e publicar a versão no GitHub, dispara-se o **Pre-Release Translation Gate**:
   - Um extrator automatizado (`python scripts/audit_i18n.py --extract`) identifica todas as novas strings visíveis introduzidas no código.
   - As traduções para Inglês e Espanhol são geradas em um **único lote concentrado (One-Shot Token Batch)**.
   - A ferramenta de auditoria estrita (`python scripts/audit_i18n.py --strict`) valida 100% de paridade e simetria antes do build local.

---

## 2. Catálogo de Elementos Visíveis de Interface (UI Surface Checklist)

Para assegurar que **absolutamente nenhum texto visível ao usuário seja esquecido**, toda interface do ARK Router deve respeitar o catálogo de superfícies visuais abaixo:

| Superfície de UI | Seletor / Padrão LuCI | Exemplo em Código | Requisito de Tradução |
|---|---|---|---|
| **Títulos de Seção / Painel** | `h2`, `h3`, `legend`, `title` | `E('h3', {}, [_t('Dispositivos Conectados')])` | Título limpo, capitalização consistente, claro para o usuário leigo. |
| **Kickers & Subtítulos** | `.ex-kicker`, `small`, `p.description` | `E('div', {class: 'ex-kicker'}, [_t('Enlace de alta velocidade')])` | Explicação sucinta de 1 linha orientando a finalidade do recurso. |
| **Janelas Modais** | `ui.showModal(title, ...)` | `ui.showModal(_t('Configurar Multi-WAN'), [...])` | Título conciso, corpo explicativo com avisos claros sobre impacto na internet. |
| **Travas e Botões de Ação** | `button`, `confirmText`, `cancelText` | `confirmText: _t('Confirmar e Reiniciar')` | Verbos no imperativo ("Salvar", "Aplicar", "Reiniciar", "Cancelar"). |
| **Badges de Estado e Telemetria** | `.badge`, status spans | `_t('CONECTADO')`, `_t('DESCONECTADO')` | Estados diretos em caixa alta ou capitalizados, mantendo coerência visual. |
| **Campos de Formulário & Rótulos** | `label`, `.cbi-value-title` | `E('label', {}, [_t('Servidor DNS Primário')])` | Termos técnicos claros sem ambiguidade. |
| **Textos de Ajuda & Validação** | `.cbi-value-description`, `.error` | `_t('Ex: 51413, 6881:6999 ou 1024:65535')` | Exemplos realistas e instruções claras de limites numéricos/formatos. |
| **Textos Fantasma / Placeholders** | `placeholder: '...'` | `placeholder: _t('Digite o nome da rede')` | Instrução de preenchimento orientativa. |
| **Notificações e Alertas Flutuantes** | `ui.addNotification({message})` | `ui.addNotification({message: _t('Configuração salva com sucesso!')})` | Feedback imediato sobre o sucesso ou falha da requisição RPC. |
| **Dicas de Hover & Acessibilidade** | `title: '...'`, `aria-label: '...'` | `title: _t('DNS da Operadora (Dinâmico)')` | Dica complementar visível ao passar o cursor ou para leitores de tela. |

---

## 3. Glossário Técnico Intocável (Termos Protegidos)

Termos universais consagrados pelas normas internacionais de telecomunicações (IEEE, IETF, 3GPP e documentação upstream do OpenWrt) **NUNCA devem ser traduzidos literalmente ou corrompidos** em nenhum dos idiomas.

### Termos Protegidos em PT-BR, EN e ES:
- **Rede & Roteamento**: `WAN`, `Dual-WAN`, `LAN`, `VLAN`, `SSID`, `BSSID`, `MAC`, `MTU`, `DSCP`, `NAT`, `DMZ`, `UPnP`, `PPPoE`, `DHCP`, `DNS`, `IPv4`, `IPv6`, `Failover`, `Load Balancing`, `PBR (Policy-Based Routing)`.
- **Desempenho & QoS**: `CAKE`, `SQM`, `FQ-CoDel`, `Bufferbloat`, `Throughput`, `Ping`, `Jitter`, `Full Duplex`, `Half Duplex`, `Fastpath`, `Flow Offloading`, `PPE`, `WED`.
- **Wi-Fi & Mesh**: `Wi-Fi 6`, `Wi-Fi 7`, `MLO (Multi-Link Operation)`, `2.4 GHz`, `5 GHz`, `6 GHz`, `WPA2`, `WPA3`, `802.11r (Fast Roaming)`, `802.11k/v`, `802.11s (Mesh)`, `BSS Coloring`, `TWT`, `Target Wake Time`.
- **VPNs & Módulos ARK**: `WireGuard`, `OpenVPN`, `ZeroTier`, `Speedify`, `Starlink`, `Modo Gamer`, `Baby Jumbo (RFC 4638)`.

---

## 4. Diretrizes de Adaptação Nativa por Idioma

O objetivo é entregar interfaces que soem naturais tanto para o usuário doméstico comum quanto para técnicos e administradores de rede experientes de seus respectivos idiomas nativos.

### 4.1 Português do Brasil (PT-BR) — Idioma Padrão do Projeto
- **Tom**: Direto, acolhedor, profissional e autoexplicativo.
- **Padrão de UX**: Usa termos cotidianos da internet brasileira sem jargões desnecessários ("Rede Wi-Fi", "Dispositivos Conectados", "Teste de Velocidade").
- **Exemplo**: `"Acelerar BitTorrent / P2P nas 2 Internets"`.

### 4.2 Inglês (EN) — Padrão Técnico Internacional
- **Tom**: Padrão conciso de telecomunicações norte-americano (OpenWrt / Cisco / Ubiquiti UI standard).
- **Regras Estritas**:
  - Evitar traduções literais robóticas.
  - Usar termos oficiais consagrados:
    - *Redirecionamento de portas* -> **Port Forwarding** (e nunca *"Ports redirection"*).
    - *Regras de tráfego* -> **Traffic Rules**.
    - *IPs estáticos / Fixos* -> **Static Leases** ou **DHCP Reservations**.
    - *Reiniciar* -> **Reboot** (para o roteador) ou **Restart** (para um serviço).
    - *Dispositivos conectados* -> **Connected Devices** ou **Active Clients**.
    - *Limites de banda* -> **Bandwidth Limits**.
  - Verbos de ação nos botões: voz ativa no imperativo (*"Save & Apply"*, *"Discard Changes"*, *"Run Test"*).
- **Exemplo**: `"Accelerate BitTorrent / P2P across both Internet links"`.

### 4.3 Espanhol Neutro (ES) — América Latina e Internacional
- **Tom**: Espanhol técnico neutro e fluido.
- **Regras Estritas**:
  - Evitar regionalismos restritos à Espanha (como chamar computadores de *"ordenadores"*; utilize *"dispositivos"*, *"computadoras"* ou *"equipos"*).
  - Usar terminologia padrão da indústria latino-americana de telecomunicações:
    - *Redirecionamento de portas* -> **Reenvío de puertos**.
    - *Regras de tráfego* -> **Reglas de tráfico / Cortafuegos**.
    - *Reiniciar* -> **Reiniciar el enrutador** ou **Reiniciar servicio**.
    - *Ponto de Acesso* -> **Punto de Acceso (AP)**.
    - *Provedor / Operadora* -> **Proveedor de Internet (ISP)**.
- **Exemplo**: `"Acelerar BitTorrent / P2P en ambas conexiones a Internet"`.

---

## 5. Workflow Operacional Passo a Passo (Pre-Release Gate)

```mermaid
flowchart TD
    A["Fase 1: Prototipagem de Código em src/"] -->|"Desenvolvimento 100% em PT-BR"| B["Fase 2: Validação Funcional e Visual na VM"]
    B -->|"Feature Pronta & Testada"| C["Fase 3: Pre-Release Translation Gate"]
    C -->|"1. python scripts/audit_i18n.py --extract"| D["Gera docs/missing_i18n.json (One-Shot Batch)"]
    D -->|"2. Tradução Concentrada em Lote (EN + ES)"| E["Injeção em src/core/i18n/{en,es}.js"]
    E -->|"3. python scripts/audit_i18n.py --strict"| F{"Audit Aprovada?"}
    F -->|Não| D
    F -->|Sim (100% Cobertura)| G["Fase 4: Compilação do Bundle & Minificação"]
    G -->|"python scripts/build_frontend_bundle.py"| H["Atualiza root/.../overview.js e i18n.{en,es}.js"]
    H -->|"python scripts/build_minified_assets.py"| I["Assets Minificados (< 60 KB)"]
    I --> J["Fase 5: Empacotamento Local e Publicação GitHub"]
```

### O Runbook de Comandos:

```bash
# 1. Extrair strings pendentes para arquivo estruturado em JSON
python scripts/audit_i18n.py --extract docs/missing_i18n.json

# 2. Traduzir o lote JSON e injetar nos dicionários (en.js e es.js)
# (Realizado em uma única chamada concentrada pela IA ou tradutor)

# 3. Validar cobertura estrita nos 3 idiomas (PT-BR, EN, ES)
python scripts/audit_i18n.py --strict

# 4. Atualizar o catálogo de referência da documentação
python scripts/audit_i18n.py --catalog docs/I18N_CATALOG_SUMMARY.md

# 5. Gerar bundle de produção e sincronizar com LuCI
python scripts/build_frontend_bundle.py
python scripts/build_minified_assets.py

# 6. Rodar bateria de testes locais
bash tests/run_local_tests.sh
```

---

## 6. Automação e Ferramentas (`scripts/audit_i18n.py`)

O utilitário `scripts/audit_i18n.py` é o guardião contínuo da internacionalização do ARK Router.

### Modos de Operação:
- **`python scripts/audit_i18n.py`**:
  Execução padrão integrada ao `tests/run_local_tests.sh`. Varre o código-fonte, compara com os dicionários e falha com código `1` se houver alguma string visível em PT-BR sem tradução em EN ou ES.
- **`python scripts/audit_i18n.py --extract [caminho.json]`**:
  Modo pré-release. Exporta um JSON com todas as strings pendentes categorizadas por componente e arquivos de origem, pronto para ser traduzido em um único turno de tokens.
- **`python scripts/audit_i18n.py --strict`**:
  Auditoria rigorosa. Além de exigir 100% das strings do código traduzidas, valida a simetria exata entre os dicionários EN e ES (proíbe chaves órfãs ou assimétricas).
- **`python scripts/audit_i18n.py --catalog [caminho.md]`**:
  Gera relatório Markdown sumarizado da cobertura de cada categoria visual de UI (`modal_title`, `kicker`, `button`, `notification`, etc.).

---
*Documento canônico do projeto ARK Router — Mantido sob diretrizes de eficiência de contexto e precisão de engenharia de redes.*
