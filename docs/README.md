# ARK Router — Índice Canônico de Documentação Técnica

> **Mapa Oficial de Documentação Técnica do Projeto (v1.5.9)**
> Este índice orienta desenvolvedores e agentes de IA para as fontes canônicas de cada domínio técnico, eliminando ambiguidades e documentos concorrentes.

---

## 1. Mapa de Fontes Canônicas por Domínio

| Domínio Técnico | Documento Canônico Oficial | Descrição e Escopo |
|---|---|---|
| **Arquitetura & RPC** | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | Subsistemas, despachante RPC, handlers e ciclo de vida do daemon. |
| **Compatibilidade OpenWrt** | [`docs/COMPATIBILITY_MATRIX.md`](COMPATIBILITY_MATRIX.md) | Limites oficiais entre `fw3` (<=21.02) e `fw4` (>=22.03), `opkg` (<=24.10) e `apk` (>=25.12). |
| **Auditoria e Contratos** | [`docs/FEATURE_AUDIT_AND_REBOOT.md`](FEATURE_AUDIT_AND_REBOOT.md) | Catálogo vivo dos 69 recursos com persistência pós-reboot e não-interferência. |
| **Instalação e Configuração** | [`docs/INSTALL.md`](INSTALL.md) | Guia completo de instalação via pacote (.apk/.ipk), primeiro boot e assistente Ark - Setup. |
| **Publicação e Releases** | [`docs/PUBLISHING.md`](PUBLISHING.md) | Procedimento oficial de empacotamento local (WSL) e deploy em GitHub Releases. |
| **Laboratório Virtual** | [`docs/VIRTUALBOX_TEST_ENVIRONMENT.md`](VIRTUALBOX_TEST_ENVIRONMENT.md) | Infraestrutura de teste isolada no VirtualBox (`OpenWrt-ARK-Dev`), snapshots e topologias. |
| **Design System & UI QA** | [`docs/UI_DESIGN_SYSTEM_AND_QA.md`](UI_DESIGN_SYSTEM_AND_QA.md) | Padrões de DOM LuCI, modais, touch targets de 40px+, isolamento de rolagem e testes visuais. |
| **Perfis e Orçamento Físico** | [`docs/MODULES_AND_HARDWARE_PROFILES.md`](MODULES_AND_HARDWARE_PROFILES.md) | Matriz de hardware (Ultra-Lite 128MB, Balanced 256-512MB, Pro 1GB+), limites de RAM e Flash. |
| **Perfis de Pacote (Lite vs Full)** | [`docs/PACKAGE_PROFILES.md`](PACKAGE_PROFILES.md) | Limiares de seleção automática de pacote, dependências de release e orçamentos de `/overlay`. |
| **Recuperação TFTP (Cudy WR3000)** | [`docs/CUDY_WR3000_TFTP_RECOVERY.md`](CUDY_WR3000_TFTP_RECOVERY.md) | Procedimento de resgate de emergência via TFTP e migração segura do firmware OEM. |
| **Segurança e Isolamento** | [`docs/SECURITY.md`](SECURITY.md) | Política de segurança, proteção de credenciais e auditoria de tokens efêmeros em `/tmp`. |
| **Diagnósticos de Rede & Doctor** | [`docs/network-diagnostics.md`](network-diagnostics.md) | Rotinas de auto-cura do `ark-doctor`, testes de ping anycast e resolução de falhas. |
| **Histórico de Lançamentos** | [`CHANGELOG.md`](../CHANGELOG.md) | Registro cronológico oficial de todas as releases e correções do sistema. |

---

## 2. Documentos de Apoio e Status
- **Auditoria Incremental**: Diretório [`docs/audit/`](audit/) (checkpoints históricos do Lote 000 e decisões de arquitetura em [`audit/DECISIONS.md`](audit/DECISIONS.md)).
- **Catálogo de AdBlock**: [`docs/ADBLOCK_WHITELIST_CATALOG.md`](ADBLOCK_WHITELIST_CATALOG.md) (whitelist de domínios essenciais para bancos, streaming e serviços públicos).
