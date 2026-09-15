# ARK Router — Diretrizes de Desenvolvimento

## Escopo
Interface LuCI moderna e otimizações de rede para OpenWrt, compatível com hardware legado (128 MB RAM / 16 MB Flash) e moderno (256 MB a 1 GB RAM / Filogic).

## Regras Obrigatórias do Sistema
- **Shell POSIX**: Todos os scripts devem rodar sob BusyBox `ash` e `/bin/sh` puro. Proibido bashisms (`[[ ]]`, `${var//}`, arrays).
- **Dual OpenWrt**: Detecte dinamicamente gerenciador (`apk` vs `opkg`) e firewall (`nftables`/`fw4` vs `iptables`/`fw3`).
- **Limites de Flash & RAM**: Mantenha sempre > 2 MB livres no `/overlay`. NUNCA grave logs ou métricas crescentes em `/etc` ou `/root`; use `/tmp` (RAM).
- **Assets & Minificação**: Código em desenvolvimento (`root/www/...`) permanece legível e comentado. Minifique para produção via `scripts/build_minified_assets.py`. Orçamento do tema < 60 KB compactado.
- **Segurança e Interceptação**: Não altere firmware, partições ou interfaces sem confirmação. Ações críticas de UI usam `addEventListener(..., true)` e trava de 2s.
- **Validação Local Obrigatória**: Após qualquer alteração de código, execute os testes locais no sandbox sem necessidade de roteador:
  ```sh
  tests/run_local_tests.sh
  ```

## Documentação Modular Especializada (Consulte sob demanda)
- **Regras de UI, Toque e Modais LuCI**: @docs/ark-ui-rules.md
- **Orçamento de Hardware, Flash e Buffers**: @docs/hardware-budget.md
- **Diagnósticos de Rede, SQM e Dual OpenWrt**: @docs/network-diagnostics.md
- **Segurança, Tokens e Shell POSIX**: @docs/security-rules.md
- **Firmware, Hashes e ImageBuilder**: @docs/firmware-runbook.md
