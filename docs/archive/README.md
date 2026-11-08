# ARK Router — Arquivo Histórico & Diagnósticos Datados (`docs/archive/`)

> **Finalidade**: Armazenamento de memórias técnicas, estudos de caso pontuais, medições com data no nome e diagnósticos forenses concluídos do ecossistema ARK Router.  
> **Classificação**: **Camada 4** do Catálogo Mestre ([`docs/README.md`](../README.md)).

---

## ⚠️ Diretriz Obrigatória de Leitura (Economia de Contexto)
- **NÃO carregue estes documentos na inicialização de turnos de IA nem em fluxos normais de desenvolvimento.**
- O conteúdo destes arquivos é composto por **snapshots imutáveis** e evidências datadas de investigações concluídas.
- Consulte-os **apenas** quando for expressamente necessário investigar a causa raiz histórica de um incidente documentado.

---

## 📂 Catálogo de Documentos Arquivados

| Arquivo | Contexto Histórico / Escopo Original da Investigação | Lote / Tarefa |
| :--- | :--- | :--- |
| [`ANALISE_HARDWARE_WIFI_W6X_2026_11_05.md`](ANALISE_HARDWARE_WIFI_W6X_2026_11_05.md) | Diagnóstico pontual de hardware e Wi-Fi do W6x em 05/11/2026. | Investigação pontual |
| [`ANALISE_MULTICORE_W6X_2026_11_02.md`](ANALISE_MULTICORE_W6X_2026_11_02.md) | Auditoria somente-leitura de distribuição CPU/IRQ/NAPI/RPS no Acer W6x. | `T-081` |
| [`ANALISE_WIFI_CELULARES_2026_11_02.md`](ANALISE_WIFI_CELULARES_2026_11_02.md) | Investigação de limites de vazão Wi-Fi em smartphones no W6x. | `T-080` |
| [`REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md`](REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md) | Consolidação de testes de sessão Wi-Fi e multicore pós-`T-083`. | `T-084` |
| [`OTIMIZACAO_MULTICORE_T083.md`](OTIMIZACAO_MULTICORE_T083.md) | Registro da serialização de jobs (`serialized-job.sh`) e cache quente. | `T-083` |
| [`DIAGNOSTICO_ONT_HUAWEI_2026_10_29.md`](DIAGNOSTICO_ONT_HUAWEI_2026_10_29.md) | Telemetria óptica GPON da ONT Huawei EG8145X6-10. | `T-075` / `T-076` |
| [`DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md`](DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md) | Correlação de amostras de CPU/CAKE, ICMP e UDP sob carga. | `T-072` |
| [`DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md`](DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md) | Captura ICMP WAN e análise de eventos ociosos. | `T-073` / `T-074` |
| [`MIGRACAO_TP_LINK_XZ005_G6_2026_10_29.md`](MIGRACAO_TP_LINK_XZ005_G6_2026_10_29.md) | Notas de preparação para ponte óptica TP-Link XZ005-G6 2.5GbE. | `T-077` |
| [`MANUAL_ACESSO_E_COMANDOS_ONT_TPLINK_XZ005_G6.md`](MANUAL_ACESSO_E_COMANDOS_ONT_TPLINK_XZ005_G6.md) | Manual técnico de acesso Telnet, CLI e Data Model HTTP (/cgi?9) da ONT TP-Link XZ005-G6. | `T-077` |
| [`TESTE_WAVEFORM_CABO_2026_10_29.md`](TESTE_WAVEFORM_CABO_2026_10_29.md) | Medições comparativas de Bufferbloat Waveform via cabo Ethernet. | `T-071` |
| [`ESTUDO_TCP_BBR_TFO_DNS_STALE_CACHE.md`](ESTUDO_TCP_BBR_TFO_DNS_STALE_CACHE.md) | Fundamentação RFC/Kernel de TCP BBR, TFO, `tcp_notsent_lowat` e DNS Stale Cache. | `T-066` |
| [`ESTUDO_W6X_OPENWRT_25_12_5_LATENCIA.md`](ESTUDO_W6X_OPENWRT_25_12_5_LATENCIA.md) | Recorte de latência e WED no Filogic 830 / OpenWrt 25.12.5. | `T-064` |
| [`ESTUDO_WIFI_LATENCIA_BUFFERBLOAT.md`](ESTUDO_WIFI_LATENCIA_BUFFERBLOAT.md) | Estudo de AQL, airtime fairness e bufferbloat Wi-Fi. | `T-064` |
| [`REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md`](REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md) | Revisão consolidada dos parâmetros Wi-Fi após a release `v2.1.6`. | `T-070` |
