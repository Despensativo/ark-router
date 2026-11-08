# ARK Router — Revisão Geral da Documentação Markdown

> **Versão Auditada**: `2.2.1` (conforme `VERSION` e `docs/DEVELOPMENT_GUIDE.md`)
> **Data da Auditoria**: Novembro de 2026
> **Escopo**: Todos os arquivos `.md` do ecossistema ARK Router — raiz do workspace, repositório canônico (`GitHub/luci-app-ark-router/`) e repositório de skills (`.agents/skills/`)

---

## Sumário Executivo

O ecossistema ARK Router acumulou mais de **80 arquivos Markdown** distribuídos em quatro zonas distintas. A versão ativa é `2.2.1`. A estrutura de documentação foi amplamente organizada em 5 camadas no `docs/README.md`, porém persistem inconsistências críticas: documentos de engenharia pontual datados convivem na pasta `docs/` principal com guias vivos; o `ROADMAP.md` ainda cita `v2.0.0` como alvo de "Short Term"; e o arquivo `ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md` declara `v2.1.8-r1` no cabeçalho. A pasta `docs/` concentra 55+ arquivos quando a separação entre Camada 2 (canônica) e Camada 4 (histórica/datada) deveria ser aplicada com mais rigor.

---

## Diagnóstico de Desatualizações

### 1. Versões Legadas Referenciadas como Estado Atual

**`docs/ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md`** (20,8 KB)
- Linha 5: `Versão do Ecossistema: luci-app-ark-router v2.1.8-r1`
- Este documento descreve a arquitetura dual-engine de QoS como documento canônico (`docs/README.md`, Camada 2), mas declara versão `v2.1.8-r1` no cabeçalho. O conteúdo técnico permanece válido em `2.2.1`, porém a declaração de versão no cabeçalho é enganosa: um agente de IA que leia os primeiros parágrafos assumirá que está numa base `2.1.8`.
- **Ação**: Atualizar o cabeçalho para refletir a versão homologada `2.2.1` ou adicionar nota explícita de que o documento foi escrito em `v2.1.8` e permanece válido.

**`docs/REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md`** (16,4 KB)
- O próprio nome do arquivo embute `2_1_6`. O cabeçalho cita `HEAD bc68981e531750ba39bfcee65f757a5f9b5cb8b5`, `VERSION=2.1.6` e alerta que `AGENTS.md` ainda declarava `2.1.5`.
- Classificado pela `docs/README.md` como Camada 4 (histórico), mas o alerta interno de desatualização do próprio documento não foi resolvido: o arquivo continua com alertas autorreferentes sobre `AGENTS.md` da época.
- **Ação**: Confirmar status como Camada 4 e remover ou neutralizar o alerta interno que pode confundir agentes de IA.

**`docs/INSTALL.md`** (13,2 KB)
- Linha 165: `Note that Tailscale was removed in v1.5.9 due to high binary footprint on flash-constrained devices.`
- Referência a `v1.5.9` legada; o contexto é histórico mas integrado a um guia operacional ativo. Usuários podem confundir a frase como referência ao estado atual.
- **Ação**: Reescrever como fato consumado presente, sem ancoragem em número de versão: "Tailscale is not included due to high binary footprint."

**`docs/ROADMAP.md`** (675 bytes)
- Seção "Short Term": `Test the published v2.0.0 package across architectures...` e `Validate V2 Cockpit & Feature Center lifecycle...`
- O projeto está em `v2.2.1`. Os itens de `v2.0.0` foram concluídos há pelo menos dois ciclos. O `ROADMAP.md` não foi atualizado após o ciclo de homologação de `v2.0.0`.
- **Ação**: Atualizar ou arquivar. Se o roadmap for mantido como documento vivo, remover itens concluídos e adicionar os planejamentos para `v2.3+`.

**`docs/MODULES_AND_HARDWARE_PROFILES.md`** (arquivo com tamanho a verificar)
- Linha 37: `VPN peer-to-peer leve para acesso remoto. Substituto oficial para Tailscale (removido na v1.5.9).`
- Mesmo problema do `INSTALL.md`: âncora na versão `v1.5.9` legada em documento canônico de Camada 2.
- **Ação**: Reformular sem âncora de versão.

### 2. Referências a Regras de Firewall Legadas Apresentadas como Modernas

**`docs/FEATURE_AUDIT_AND_REBOOT.md`** (158 KB — 74 contratos funcionais)
- Linha 236: `Dependências e Pacotes: mwan3, iptables ou nftables, ip-full`
- Linha 246: `Requer suporte do mwan3 para o backend de firewall ativo (iptables ou nftables).`
- Linha 586: `Dependências e Pacotes: firewall3 ou firewall4, iptables ou nftables`
- Linha 840: `Dependências e Pacotes: tc-full ou iptables/nftables, kmod-sched-core`
- A forma `iptables ou nftables` como dependência genérica é tecnicamente correta para manutenção de retrocompatibilidade, mas pode induzir agentes de IA a invocar `iptables` diretamente em ambientes `fw4` — exatamente a armadilha `ARK-04` do `PLAYBOOK.md`.
- **Ação**: Reformular como `nftables (fw4) ou iptables (fw3 legado — 19.07/21.02)` com referência explícita ao `is_fw4`/`is_fw3` de `common.sh`.

**`docs/LATEST_CHANGELOG.md`** (referência a `fw3`)
- Linha 40: `No fw3 (iptables): ativa fullcone=1 nas zonas WAN em /etc/config/firewall.`
- Esta linha está num contexto correto (bloco condicional explicando o caminho legado), mas o documento como um todo não sinaliza de forma proeminente que `fw3` é somente para OpenWrt `<= 21.02`.
- **Ação**: Adicionar nota de contexto antes da seção mencionando a faixa de versão do OpenWrt para cada caminho.

**`docs/ARK_ROUTER_EXHAUSTIVE_COMMANDS_AND_SUBSYSTEMS_MANUAL.md`** (grande)
- Linha 737: referência a `miniupnpd-iptables` sem clareza sobre se o contexto é `fw3` ou legado isolado.
- **Ação**: Adicionar contexto de versão/engine do firewall na menção.

### 3. Referências a CI/CD Remoto do GitHub Actions como Procedimento Padrão

**`docs/PUBLISHING.md`** (6,3 KB)
- Linha 29: `The cloud GitHub Actions workflow (.github/workflows/build-packages.yml) is kept only as an optional background fallback (workflow_dispatch), eliminating the slow cloud build queue.`
- O documento *já reconhece* que o workflow é apenas fallback opcional, o que está correto. Porém a estrutura narrativa do `PUBLISHING.md` coloca o fluxo local antes, mas não deixa explícito de forma imediata que o CI/CD na nuvem está **desativado como padrão operacional** do projeto.
- **Ação**: Adicionar aviso de destaque no topo do `PUBLISHING.md` indicando que `build-packages.yml` é somente `workflow_dispatch` opcional e que todo build de release é gerado localmente.

### 4. Referências a Caminhos de Testes ou Scripts Refatorados

**`docs/FEATURE_AUDIT_AND_REBOOT.md`** (158 KB)
- Referencia `scripts/verify_dom_progressive.mjs`, `scripts/qa_visual_matrix.py`, `scripts/verify_theme_overview.py` e `scripts/qos_benchmark.py` ao longo de 74 contratos.
- Esses caminhos precisam ser verificados contra o repositório canônico regularmente. Se algum script foi renomeado ou movido em refatorações, as 74 entradas de contrato ficam com caminhos quebrados.
- **Ação**: Integrar verificação automática de existência de scripts referenciados na suíte de testes locais (`tests/run_local_tests.sh`).

**`docs/CODE_MAP.md`** (74,3 KB — gerado automaticamente)
- É gerado via `scripts/generate_code_map.py`. Deve ser regenerado após qualquer refatoração. Não é um documento para leitura manual contínua.
- **Ação**: Adicionar aviso no cabeçalho de que o arquivo é gerado e não deve ser editado manualmente.

---

## Recomendações de Arquivamento

### Critérios de Arquivamento

Um documento é candidato ao arquivamento quando satisfaz ao menos dois dos seguintes critérios:
1. O nome do arquivo contém data explícita (ex: `_2026_10_29`, `_2026_11_02`).
2. O conteúdo descreve uma investigação pontual concluída com evidências coletadas numa sessão específica.
3. O documento é referenciado pela `docs/README.md` como Camada 4 (histórico/datado).
4. O documento não é atualizado como resultado de evoluções de código — é um snapshot imutável.

### Arquivos Recomendados para `docs/archive/` (Arquivo Histórico de docs/)

| Arquivo | Tamanho | Justificativa | Destino Sugerido |
| :--- | :--- | :--- | :--- |
| `DIAGNOSTICO_ONT_HUAWEI_2026_10_29.md` | 8,1 KB | Diagnóstico pontual de ONT Huawei em sessão de 29/10/2026. Já referenciado como Camada 4. | `docs/archive/` |
| `DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md` | 8,6 KB | Captura instrumentada do W6x em data específica. Snapshot imutável. | `docs/archive/` |
| `DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md` | 12,2 KB | Captura ICMP WAN em sessão pontual (T-073/T-074). Já Camada 4. | `docs/archive/` |
| `ANALISE_HARDWARE_WIFI_W6X_2026_11_05.md` | 10,3 KB | Análise de hardware Wi-Fi em data específica. Investigação concluída. | `docs/archive/` |
| `ANALISE_MULTICORE_W6X_2026_11_02.md` | 19,2 KB | Sessão de análise multicore de 02/11/2026. Snapshot de investigação. | `docs/archive/` |
| `ANALISE_WIFI_CELULARES_2026_11_02.md` | 20,4 KB | Análise de comportamento Wi-Fi de celulares em data específica. | `docs/archive/` |
| `ESTUDO_TCP_BBR_TFO_DNS_STALE_CACHE.md` | 8,2 KB | Fundamentação RFC para T-066. Conteúdo estável, não atualizado com o código. | `docs/archive/` |
| `ESTUDO_W6X_OPENWRT_25_12_5_LATENCIA.md` | 21,2 KB | Recorte de latência para OpenWrt 25.12.5 (versão anterior). Concluído. | `docs/archive/` |
| `ESTUDO_WIFI_LATENCIA_BUFFERBLOAT.md` | 35,1 KB | Estudo de AQL/airtime fairness para T-064. Investigação concluída. | `docs/archive/` |
| `REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md` | 13,9 KB | Registro de sessão de teste Wi-Fi multicore em data específica. | `docs/archive/` |
| `MIGRACAO_TP_LINK_XZ005_G6_2026_10_29.md` | 2,9 KB | Notas de preparação para T-077. Migração concluída. | `docs/archive/` |
| `TESTE_WAVEFORM_CABO_2026_10_29.md` | 4,2 KB | Medições Waveform em data específica (T-071). Snapshot imutável. | `docs/archive/` |
| `REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md` | 16,0 KB | Revisão consolidada da `v2.1.6`. Versão superada (`2.2.1`). | `docs/archive/` |
| `OTIMIZACAO_MULTICORE_T083.md` | 10,3 KB | Estudo de otimização multicore para T-083. Concluído. | `docs/archive/` |
| `ROADMAP.md` (se não atualizado) | ~675 B | Cita `v2.0.0` como curto prazo. Desatualizado há 2 ciclos. | Atualizar ou `docs/archive/` |

**Total de arquivos candidatos a migração**: 15 arquivos (~187 KB liberados da pasta `docs/` principal)

### Arquivos Recomendados para `tasks/done/`

| Arquivo | Tamanho | Justificativa | Destino Sugerido |
| :--- | :--- | :--- | :--- |
| `MANUAL_ACESSO_E_COMANDOS_ONT_TPLINK_XZ005_G6.md` | Verificar | Manual operacional de uma ONT específica para tarefa T-077 concluída. | `tasks/done/` |

### Avaliação do `GUIA-INSTALACAO-ROM-CUDY-WR3000-OUTRA-IA.md` (Raiz do Workspace)

- **Tamanho**: A verificar (~30–40 KB estimado pelo conteúdo observado)
- **Versão declarada**: `v1.0.2` (setembro de 2026) — quatro versões principais atrás da `2.2.1`
- **Conteúdo**: Guia de compilação de ROM para o Cudy WR3000 com parâmetros de rede específicos (`192.168.17.1`), caminhos de Windows (`C:\Users\User\Desktop\...`) e hash SHA-256 de um firmware `v1.0.2`.
- **Guia canônico atual**: `docs/CUDY_WR3000_TFTP_RECOVERY.md` (Camada 3, 2,8 KB estimado)
- **Decisão**: O `GUIA-INSTALACAO-ROM-CUDY-WR3000-OUTRA-IA.md` descreve um procedimento para IAs externas (`Cursor, Claude, Antigravity, Copilot, ChatGPT`) para uma versão `v1.0.2` obsoleta. Deve ser migrado para `tasks/done/` ou `Offline/` como registro histórico, sem permanecer na raiz do workspace onde agentes de IA podem confundi-lo com o guia canônico atual.

### Arquivos de `docs/audit/batches/` — Política

Os lotes `000` a `034` em `docs/audit/batches/` são registros imutáveis de investigações auditadas. Não devem ser arquivados individualmente, mas o diretório `batches/` em si deve continuar sendo tratado como zona de leitura sob demanda (conforme `docs/audit/README.md`). O `TEMPLATE.md` deve permanecer como referência.

---

## Otimização de Estrutura e Modo Operandi

### 1. Classificação por Perfil e Público-Alvo

| Perfil | Público Principal | Exemplos de Documentos | Frequência de Leitura |
| :--- | :--- | :--- | :--- |
| **Governança / Agente IA** | Modelos de IA, automações | `AGENTS.md` (repo + workspace), `PLAYBOOK.md`, `GEMINI.md`, `docs/README.md` | Todo início de turno |
| **Engenharia Canônica** | Devs, revisores de PR | `DEVELOPMENT_GUIDE.md`, `CODE_MAP.md`, `ARCHITECTURE.md`, `FEATURE_AUDIT_AND_REBOOT.md`, `COMPATIBILITY_MATRIX.md`, `LIFECYCLE_INSTALL_AND_UNINSTALL_GUIDE.md` | Por demanda (tarefa) |
| **Guias de Operação / Campo** | Usuários técnicos, ops | `INSTALL.md`, `USAGE_AND_TROUBLESHOOTING.md`, `CUDY_WR3000_TFTP_RECOVERY.md`, `ARK_ROUTER_PACKAGES_UPDATE_GUIDE.md`, `PUBLISHING.md`, `NETWORK_ENGINEERING_FIXES_AND_TEST_CHECKLIST.md` | Execução de procedimentos |
| **Tratados Científicos de QoS** | Engenheiros de kernel, pesquisadores | `ENCICLOPEDIA_MASTER_QOS_KERNEL_LINUX_ARK_2026.md`, `TRATADO_DEFINITIVO_QOS_AQM_LINUX_OPENWRT.md`, `ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md` | Consulta específica (não carregar na inicialização) |
| **Auditoria Incremental** | Equipe de auditoria, agentes de IA | `docs/audit/README.md`, `STATUS.md`, `DECISIONS.md`, `INVENTORY.md`, `batches/` | Ciclos de auditoria |
| **Skills Operacionais** | Agentes IA especializados | `.agents/skills/*/SKILL.md` (13 skills) | Carregamento sob demanda por tarefa |
| **Histórico / Datado** | Investigação forense de causa raiz | `docs/archive/` (pós-migração), `tasks/done/` | Apenas quando necessário investigar incidentes passados |

### 2. Regras de Tamanho e Densidade (Anti-Amnésia)

**Limites operacionais por categoria**:

- **Documentos de Governança** (`AGENTS.md`, `PLAYBOOK.md`): Máximo 500 linhas / 50 KB. Acima disso, exigir índice de seções com intervalos de linha (`StartLine–EndLine`) e proibir leitura integral. O `PLAYBOOK.md` (46 KB) já implementa o índice — modelo a seguir.
- **Documentos Canônicos de Engenharia**: Máximo 200 KB. Acima disso, dividir por domínio. O `FEATURE_AUDIT_AND_REBOOT.md` (158 KB) está no limite; o `CHANGELOG-COMPLETO.md` (204 KB) ultrapassa e deve ser consultado apenas por SHA de commit específico.
- **Documentos de QoS Científico**: Sem limite rígido de tamanho, mas **nunca carregar na inicialização de turnos**. Consultar apenas mediante referência explícita de tarefa com o trecho-alvo identificado via `grep`/`rg` antes da leitura.
- **CODE_MAP.md** (74 KB): É gerado automaticamente. Consultar sempre via pesquisa de função (`grep`) e ler apenas a janela `StartLine–EndLine` necessária. Nunca lido integralmente.
- **TASK.md** (< 2 KB): Manter estritamente abaixo de 60 linhas. Histórico vai para `tasks/done/`.

**Regras Anti-Amnésia Obrigatórias**:

1. **Documentos acima de 500 linhas**: Requerem índice de seções com linhas exatas no cabeçalho.
2. **Documentos acima de 100 KB**: Proibida leitura integral por agente de IA. Consulta somente via `grep`/`rg` + leitura do trecho localizado (máximo 150 linhas ao redor do alvo).
3. **`CHANGELOG-COMPLETO.md`** (204 KB): Acessar somente para investigação histórica de versão específica. Nunca inicializar turno de desenvolvimento com ele.
4. **`FEATURE_AUDIT_AND_REBOOT.md`** (158 KB): Consultar via `grep` pelo nome do contrato ou número da funcionalidade. O documento lista 74 contratos — ler um contrato por vez, não o arquivo inteiro.
5. **`CODE_MAP.md`** (74 KB): Gerado. Nunca editar manualmente. Consultar via `grep "NomeDaFunção"` para obter `StartLine–EndLine`.

### 3. Divisão por Camadas (Conforme `docs/README.md`)

O `docs/README.md` já define 5 camadas com critérios claros:

| Camada | Classificação | Regra de Leitura | Manutenção |
| :--- | :--- | :--- | :--- |
| 1 — Governança | `AGENTS.md`, `PLAYBOOK.md`, `TASK.md`, `CODE_MAP.md`, `docs/audit/README.md` | Todo início de turno (< 150 linhas por seção) | IA + Dev por toda alteração de regra ou contrato |
| 2 — Canônica Viva | `DEVELOPMENT_GUIDE.md`, `ARCHITECTURE.md`, `FEATURE_AUDIT_AND_REBOOT.md`, `COMPATIBILITY_MATRIX.md`, etc. | Consulta por demanda da tarefa | Dev ao alterar código correspondente |
| 3 — Operacional | `INSTALL.md`, `VIRTUALBOX_TEST_ENVIRONMENT.md`, `QOS_TEST_PROTOCOL.md`, `PUBLISHING.md`, etc. | Execução de procedimento específico | Dev/Ops ao validar procedimento em campo |
| 4 — Histórico/Datado | Diagnósticos, estudos datados, análises pontuais | Somente investigação forense | Imutável após criação |
| 5 — Skills | `.agents/skills/*/SKILL.md` | Carregamento pela ferramenta de skill | Equipe de skills por domínio |

**Problema atual**: Documentos de Camada 4 (ANALISE_*, DIAGNOSTICO_*, ESTUDO_*, REGISTRO_*) estão fisicamente na pasta `docs/` junto com documentos de Camada 2. Recomenda-se criar `docs/archive/` para separação física.

### 4. Diretrizes de Leitura para IAs e Humanos

**Para Agentes de IA**:
- Iniciar turno lendo: `AGENTS.md` (repo) → `PLAYBOOK.md` (Seção 0) → `TASK.md` → `docs/audit/STATUS.md`
- Para desenvolvimento: adicionar `DEVELOPMENT_GUIDE.md` e o `CODE_MAP.md` (via grep)
- Proibido inicializar com: `CHANGELOG-COMPLETO.md`, `FEATURE_AUDIT_AND_REBOOT.md`, `CODE_MAP.md` (integrais), documentos de Camada 4

**Para Devs Humanos**:
- Começo de sessão: `TASK.md` → `docs/audit/STATUS.md`
- Antes de codificar: `DEVELOPMENT_GUIDE.md` → `CODE_MAP.md` (grep do módulo-alvo)
- Antes de fazer release: `PUBLISHING.md` → `CHANGELOG.md` (atualizar) → `FEATURE_AUDIT_AND_REBOOT.md` (contratos afetados)

### 5. Modo Operandi por Categoria de Documento

| Categoria | Quando Ler | Quando Atualizar | Responsável |
| :--- | :--- | :--- | :--- |
| `AGENTS.md` | Início de todo turno de IA | Ao alterar regra universal de segurança ou adicionar novo protocolo | Dev Sênior (revisão humana obrigatória) |
| `PLAYBOOK.md` | Início de turno + antes de operação de risco | Ao identificar nova armadilha (`DO-NOT-REPEAT`) ou lição homologada | IA + Dev após confirmação |
| `TASK.md` | Início e fim de turno | A cada etapa concluída (< 60 linhas) | IA executante |
| `DEVELOPMENT_GUIDE.md` | Ao iniciar nova tarefa de desenvolvimento | Ao alterar fluxo de compilação, testes ou regras de contribuição | Dev Sênior |
| `CODE_MAP.md` | Via grep por função/método | Automaticamente via `generate_code_map.py` após refatoração | Script automatizado |
| `FEATURE_AUDIT_AND_REBOOT.md` | Ao adicionar/alterar/remover funcionalidade | A cada contrato alterado (campo a campo) | Dev responsável pela funcionalidade |
| `CHANGELOG.md` | Ao fazer release | A cada release (entry no topo) | Dev de release |
| `CHANGELOG-COMPLETO.md` | Investigação histórica apenas | Mensalmente, via consolidação dos changelogs parciais | Automatizado ou Dev |
| `COMPATIBILITY_MATRIX.md` | Ao estender suporte a novo hardware | Ao validar novo hardware ou versão de OpenWrt | Dev + evidência de teste |
| Documentos de Camada 4 | Investigação forense de causa raiz | Nunca (imutáveis) | — |

---

## Matriz Geral de Documentos Markdown

### Zona 1: Raiz do Workspace

| Arquivo | Status | Tamanho (~) | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `AGENTS.md` | Governança — Ativo | 22 KB | Manter. Leitura obrigatória de turno. |
| `PLAYBOOK.md` | Governança — Ativo | 46 KB | Manter com índice de linhas. Nunca lido integralmente. |
| `TASK.md` | Governança — Ativo | 2 KB | Manter < 60 linhas. Histórico em `tasks/done/`. |
| `GEMINI.md` | Governança — Ativo | 412 B | Manter. Contexto mínimo para Gemini. |
| `README-DA-PASTA.md` | Informativo — Ativo | A verificar | Manter como orientação de pasta. |
| `GUIA-INSTALACAO-ROM-CUDY-WR3000-OUTRA-IA.md` | Histórico/Datado — Arquivável | ~30–40 KB | Mover para `tasks/done/`. Versão `v1.0.2` obsoleta. Guia canônico: `docs/CUDY_WR3000_TFTP_RECOVERY.md`. |

### Zona 2: Repositório Canônico — Raiz

| Arquivo | Status | Tamanho (~) | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `AGENTS.md` (repo) | Governança — Ativo | 22 KB | Manter. Regras específicas do repositório. |
| `CHANGELOG.md` | Canônico — Ativo | 88 KB | Manter. Atualizar a cada release. Consultar por versão, não integralmente. |
| `CONTRIBUTING.md` | Canônico — Ativo | 1,2 KB | Manter. |
| `CODE_OF_CONDUCT.md` | Canônico — Ativo | 639 B | Manter. |
| `README.md` / `README.en.md` / `README.es.md` | Canônico — Ativo | A verificar | Manter. i18n triplo obrigatório. Atualizar a cada release com versão. |

### Zona 3: `docs/` — Camada 1 (Governança de Docs)

| Arquivo | Status | Tamanho (~) | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `docs/README.md` | Governança — Ativo | A verificar | Manter. Índice mestre das 5 camadas. |
| `docs/DEVELOPMENT_GUIDE.md` | Governança — Ativo | 11 KB | Manter. Ponto de entrada de desenvolvimento. |
| `docs/CODE_MAP.md` | Governança — Gerado | 74 KB | Manter como gerado. Proibir edição manual. Adicionar aviso no cabeçalho. |
| `docs/audit/README.md` | Governança — Ativo | 3,8 KB | Manter. Ponto de entrada da auditoria. |
| `docs/audit/STATUS.md` | Governança — Ativo | 26 KB | Manter. Checkpoint da auditoria incremental. |
| `docs/audit/DECISIONS.md` | Governança — Ativo | A verificar | Manter. Decisões de produto aprovadas. |
| `docs/audit/INVENTORY.md` | Governança — Ativo | A verificar | Manter. Matriz de propriedade e interferência. |

### Zona 4: `docs/` — Camada 2 (Canônica Viva)

| Arquivo | Status | Tamanho (~) | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `ARCHITECTURE.md` | Canônico — Ativo | 20 KB | Manter. Atualizar ao refatorar subsistemas. |
| `FEATURE_AUDIT_AND_REBOOT.md` | Canônico — Ativo | 158 KB | Manter. Corrigir menções a `iptables ou nftables` sem contexto de engine. Anti-amnésia obrigatória. |
| `COMPATIBILITY_MATRIX.md` | Canônico — Ativo | 5,5 KB | Manter. Verificar se `fw3`/`fw4` estão mapeados corretamente por versão. |
| `LIFECYCLE_INSTALL_AND_UNINSTALL_GUIDE.md` | Canônico — Ativo | 17 KB | Manter. |
| `ENCICLOPEDIA_MASTER_QOS_KERNEL_LINUX_ARK_2026.md` | Canônico — Ativo | 26 KB | Manter. Camada 2 de QoS. Não carregar na inicialização de turno. |
| `TRATADO_DEFINITIVO_QOS_AQM_LINUX_OPENWRT.md` | Canônico — Ativo | 25 KB | Manter. Fundamento científico estável. |
| `ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md` | Canônico — Desatualizado | 21 KB | Atualizar cabeçalho de `v2.1.8-r1` para `2.2.1`. |
| `MODULES_AND_HARDWARE_PROFILES.md` | Canônico — Desatualizado | A verificar | Corrigir referência a `v1.5.9`. |
| `SECURITY.md` / `security-rules.md` | Canônico — Ativo | A verificar | Manter. |
| `ARK_ROUTER_EXHAUSTIVE_COMMANDS_AND_SUBSYSTEMS_MANUAL.md` | Canônico — Ativo | Grande | Manter. Consultar via grep. |
| `WPAD_UPGRADE_AND_WIFI6_ROAMING.md` | Canônico — Ativo | A verificar | Manter. |
| `AMNEZIAWG_FEASIBILITY_AND_COMPILATION_GUIDE.md` | Canônico — Ativo | A verificar | Manter. |
| `UI_DESIGN_SYSTEM_AND_QA.md` / `ark-ui-rules.md` | Canônico — Ativo | A verificar | Manter. |
| `I18N_TRANSLATION_GUIDE.md` / `I18N_CATALOG_SUMMARY.md` | Canônico — Ativo | A verificar | Manter. |
| `ADBLOCK_WHITELIST_CATALOG.md` | Canônico — Ativo | A verificar | Manter. |

### Zona 5: `docs/` — Camada 3 (Operacional)

| Arquivo | Status | Tamanho (~) | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `INSTALL.md` | Operacional — Desatualizado | 13 KB | Corrigir menção a `v1.5.9`. Manter ativo. |
| `USAGE_AND_TROUBLESHOOTING.md` | Operacional — Ativo | A verificar | Manter. |
| `CUDY_WR3000_TFTP_RECOVERY.md` | Operacional — Ativo | A verificar | Manter. Guia canônico de TFTP. |
| `firmware-runbook.md` | Operacional — Ativo | A verificar | Manter. |
| `VIRTUALBOX_TEST_ENVIRONMENT.md` | Operacional — Ativo | 12 KB | Manter. |
| `MAC_UTM_TEST_ENVIRONMENT.md` | Operacional — Ativo | A verificar | Manter. |
| `QOS_TEST_PROTOCOL.md` | Operacional — Ativo | A verificar | Manter. |
| `ARK_ROUTER_PACKAGES_UPDATE_GUIDE.md` | Operacional — Ativo | A verificar | Manter. |
| `PUBLISHING.md` | Operacional — Desatualizado | 6 KB | Adicionar aviso explícito no topo: CI/CD nuvem é somente fallback `workflow_dispatch`. |
| `RELEASES.md` | Operacional — Ativo | A verificar | Manter. |
| `CHANGELOG-COMPLETO.md` | Histórico/Canônico | 204 KB | Manter, mas proibir leitura integral. Acessar somente por versão específica via grep. |
| `LATEST_CHANGELOG.md` | Canônico — Ativo | A verificar | Manter. |
| `ROADMAP.md` | Desatualizado — Revisar | ~675 B | Urgente: atualizar para `v2.2.x+`. Remover itens de `v2.0.0` concluídos. |
| `NETWORK_ENGINEERING_FIXES_AND_TEST_CHECKLIST.md` | Operacional — Ativo | A verificar | Manter. |
| `network-diagnostics.md` / `DOCTOR_SAFETY_MODEL.md` | Operacional — Ativo | A verificar | Manter. |
| `hardware-budget.md` | Canônico — Ativo | A verificar | Manter. |
| `PACKAGE_PROFILES.md` | Canônico — Ativo | A verificar | Manter. |

### Zona 6: `docs/` — Camada 4 (Histórico/Datado — Candidatos a `docs/archive/`)

| Arquivo | Status | Tamanho (~) | Ação Recomendada |
| :--- | :--- | :--- | :--- |
| `DIAGNOSTICO_ONT_HUAWEI_2026_10_29.md` | Histórico — Arquivável | 8 KB | Mover para `docs/archive/`. |
| `DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md` | Histórico — Arquivável | 9 KB | Mover para `docs/archive/`. |
| `DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md` | Histórico — Arquivável | 12 KB | Mover para `docs/archive/`. |
| `ANALISE_HARDWARE_WIFI_W6X_2026_11_05.md` | Histórico — Arquivável | 10 KB | Mover para `docs/archive/`. |
| `ANALISE_MULTICORE_W6X_2026_11_02.md` | Histórico — Arquivável | 19 KB | Mover para `docs/archive/`. |
| `ANALISE_WIFI_CELULARES_2026_11_02.md` | Histórico — Arquivável | 20 KB | Mover para `docs/archive/`. |
| `ESTUDO_TCP_BBR_TFO_DNS_STALE_CACHE.md` | Histórico — Arquivável | 8 KB | Mover para `docs/archive/`. |
| `ESTUDO_W6X_OPENWRT_25_12_5_LATENCIA.md` | Histórico — Arquivável | 21 KB | Mover para `docs/archive/`. |
| `ESTUDO_WIFI_LATENCIA_BUFFERBLOAT.md` | Histórico — Arquivável | 35 KB | Mover para `docs/archive/`. |
| `REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md` | Histórico — Arquivável | 14 KB | Mover para `docs/archive/`. |
| `MIGRACAO_TP_LINK_XZ005_G6_2026_10_29.md` | Histórico — Arquivável | 3 KB | Mover para `docs/archive/`. |
| `TESTE_WAVEFORM_CABO_2026_10_29.md` | Histórico — Arquivável | 4 KB | Mover para `docs/archive/`. |
| `REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md` | Histórico — Arquivável | 16 KB | Mover para `docs/archive/`. |
| `OTIMIZACAO_MULTICORE_T083.md` | Histórico — Arquivável | 10 KB | Mover para `docs/archive/`. |
| `MANUAL_ACESSO_E_COMANDOS_ONT_TPLINK_XZ005_G6.md` | Histórico — Arquivável | A verificar | Mover para `tasks/done/`. |

### Zona 7: `docs/audit/batches/` (Imutáveis por Definição)

| Diretório/Arquivo | Status | Ação |
| :--- | :--- | :--- |
| `batches/000-bootstrap.md` a `batches/034-*.md` | Histórico Auditoria — Imutável | Manter em `batches/`. Leitura somente sob demanda de investigação. |
| `batches/TEMPLATE.md` | Governança — Ativo | Manter como referência. |
| `audit/CORRECTION_AND_VALIDATION.md` | Canônico Auditoria — Ativo | Manter. |
| `audit/DECISIONS.md` | Canônico Auditoria — Ativo | Manter. |
| `audit/DEFAULTS_AND_INSTALLATION.md` | Canônico Auditoria — Ativo | Manter. |
| `audit/PLAN.md` | Canônico Auditoria — Ativo | Manter. |
| `audit/POLICIES_AND_EXCEPTIONS.md` | Canônico Auditoria — Ativo | Manter. |
| `audit/VIRTUAL_LAB.md` | Canônico Auditoria — Ativo | Manter. |

### Zona 8: Skills (`.agents/skills/`)

| Arquivo | Status | Ação |
| :--- | :--- | :--- |
| `ark-theme-ui/SKILL.md` | Ativo — Especialista UI | Carregar somente em tarefas de UI/CSS/LuCI. |
| `js-performance-optimization/SKILL.md` | Ativo — Especialista JS | Carregar somente em tarefas de performance JS. |
| `openwrt-hardware-offloading/SKILL.md` | Ativo — Especialista HW | Carregar somente em tarefas de offload. |
| `openwrt-imagebuilder/SKILL.md` | Ativo — Especialista Build | Carregar somente em builds de firmware. |
| `openwrt-luci-modern/SKILL.md` | Ativo — Especialista LuCI | Carregar somente em desenvolvimento LuCI. |
| `openwrt-network-firewall/SKILL.md` | Ativo — Especialista Firewall | Carregar somente em tarefas de rede/firewall. |
| `openwrt-sqm-bufferbloat/SKILL.md` | Ativo — Especialista QoS | Carregar somente em tarefas de QoS/SQM. |
| `openwrt-storage-failsafe/SKILL.md` | Ativo — Especialista Flash | Carregar somente em tarefas de storage/failsafe. |
| `openwrt-wifi-mesh/SKILL.md` | Ativo — Especialista Wi-Fi | Carregar somente em tarefas de Wi-Fi/roaming. |
| `posix-shell/SKILL.md` | Ativo — Especialista Shell | Carregar ao escrever scripts `.sh`. |
| `security-auditor/SKILL.md` | Ativo — Especialista Segurança | Carregar ao revisar código com implicações de segurança. |
| `systematic-debugging/SKILL.md` | Ativo — Especialista Debug | Carregar ao depurar bugs ou falhas de teste. |
| `untangle-codebase/SKILL.md` | Ativo — Especialista Refatoração | Carregar ao reorganizar módulos grandes. |

---

## Sumário de Ações Prioritárias

### Alta Prioridade (Corrigir sem Criar Novo Arquivo)

1. **`docs/ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md`**: Atualizar cabeçalho de `v2.1.8-r1` para `2.2.1`.
2. **`docs/ROADMAP.md`**: Remover itens de `v2.0.0` concluídos; atualizar para `v2.2.x+`.
3. **`docs/INSTALL.md`**: Reformular referência a `v1.5.9` sem âncora de versão.
4. **`docs/MODULES_AND_HARDWARE_PROFILES.md`**: Idem `INSTALL.md`.
5. **`docs/PUBLISHING.md`**: Adicionar aviso de destaque sobre CI/CD nuvem como fallback opcional.

### Média Prioridade (Arquivamento)

6. Criar `docs/archive/` e mover os 14 documentos de Camada 4 identificados na seção "Recomendações de Arquivamento".
7. Mover `GUIA-INSTALACAO-ROM-CUDY-WR3000-OUTRA-IA.md` da raiz do workspace para `tasks/done/`.

### Baixa Prioridade (Refinamento)

8. **`docs/FEATURE_AUDIT_AND_REBOOT.md`**: Reformular menções a `iptables ou nftables` para incluir contexto de engine (`fw3`/`fw4`).
9. **`docs/CODE_MAP.md`**: Adicionar aviso no cabeçalho de que é gerado automaticamente.
10. **`docs/REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md`**: Remover alertas autorreferentes sobre versões antigas antes de arquivar.

---

*Auditoria gerada em Novembro de 2026 — ARK Router v2.2.1*
