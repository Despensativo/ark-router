---
name: systematic-debugging
description: Use when encountering any bug, test failure, router crash, or unexpected behavior before proposing fixes. Enforces root-cause investigation, log analysis (dmesg, logread), reproducible steps, and minimal hypotheses.
---

# Systematic Debugging for ARK Router & Embedded OpenWrt

## Core Principle
```
NENHUMA ALTERAÇÃO OU CORREÇÃO SEM INVESTIGAÇÃO PRÉVIA DA CAUSA-RAIZ
```
Correções rápidas ou "chutes" em roteadores podem resultar em loops de reinicialização (bootloop), perda de acesso SSH/LuCI ou corrupção do `/overlay`.

---

## Quando Utilizar
Ative esta skill diante de qualquer falha técnica:
- Falhas em scripts de boot (`/etc/init.d/*`), Ucode ou LuCI RPC (`ubus`).
- Travamentos, `kernel panic` ou reinicializações inesperadas da CPU (MIPS QCA9558 / MediaTek MT7981).
- Inconsistências de rede (VLAN, PPPoE, Wi-Fi 2.4G/5G, roteamento).
- Falhas no pipeline de build e minificação (`build_minified_assets.py`).
- Erros de interface DOM no LuCI (modais que não abrem/fecham, layout quebrado em mobile).

---

## As 4 Fases Obrigatórias

### Fase 1: Coleta de Evidências e Investigação da Causa-Raiz
1. **Inspecionar Mensagens e Logs Reais:**
   - Analisar `dmesg` para identificar mensagens do kernel (ex: OOM killer, drivers mt76/ath9k).
   - Verificar `logread` para logs de serviços de rede (`dnsmasq`, `hostapd`, `netifd`, `uhttpd`).
   - Inspecionar erros do console no navegador ou arquivos HTML de erro do LuCI (`luci_err.html`).
2. **Reproduzir o Problema:**
   - Identificar o comando ou ação exata que dispara o erro.
   - Determinar se a falha é determinística ou intermitente (ex: concorrência, esgotamento de memória).
3. **Isolar Mudanças Recentes:**
   - O que foi alterado recentemente no repositório (`git diff`) ou na partição `/overlay`?
   - Houve atualização de configuração UCI ou pacotes (`opkg`/`apk`)?

### Fase 2: Análise de Padrões e Referência
1. Comparar com módulos LuCI ou scripts OpenWrt que estejam funcionando perfeitamente no mesmo projeto.
2. Ler a documentação ou código de referência por completo, sem assumir suposições.
3. Compreender o ciclo de vida do subsistema envolvido (`ubus call`, `uci get`, dispatcher do LuCI).

### Fase 3: Hipótese Única e Teste Mínimo
1. Formular uma hipótese clara e específica: *"A falha ocorre porque X produz Y na condição Z."*
2. Aplicar a **menor alteração possível** para testar exclusivamente essa hipótese.
3. Não corrigir múltiplos componentes simultaneamente.

### Fase 4: Validação e Prevenção de Regressão
1. Testar o comportamento antes e depois da correção.
2. Garantir que a alteração não aumentou o consumo de memória RAM nem gravou lixo permanente na Flash.
3. Confirmar que o serviço afetado reiniciou de forma limpa.
