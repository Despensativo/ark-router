# ARK Router — Diagnósticos de Rede & Dual OpenWrt

Diretrizes de compatibilidade com múltiplas gerações do OpenWrt, mitigação de bufferbloat e auditoria do sistema.

---

## 1. Dual OpenWrt Architecture (Legado vs. Moderno)
O ARK Router deve manter compatibilidade entre as duas famílias:

| Recurso | OpenWrt 19.07 a 23.05 (Legado) | OpenWrt 24.x a 25.x (Moderno) |
| :--- | :--- | :--- |
| **Gerenciador de Pacotes** | `opkg` (`/etc/opkg.conf`) | `apk` (`/etc/apk/`) |
| **Mecanismo de Firewall** | `iptables` / `firewall3` | `nftables` / `firewall4` |
| **Renderização LuCI** | Tabelas HTML tradicionais | Views JavaScript (`L.view.extend`) |
| **Regra Obrigatória** | Detectar dinamicamente (`which apk opkg`) | Detectar dinamicamente (`nft` vs `iptables`) |

---

## 2. SQM, Baby Jumbo Frames & Conflitos de Aceleração
1. **SQM em Conexões PPPoE**:
   - Em conexões PPPoE, o SQM **deve ser associado à interface lógica L3** (`pppoe-wan`), nunca à interface física (`eth1`).
   - Se for associado à interface física, a modelagem de tráfego falha e gera latência oculta.
2. **Baby Jumbo Frames (MTU 1508)**:
   - Para conexões PPPoE com MTU 1500, a interface física pai precisa operar com MTU 1508 (`config device 'wan_dev'`).
   - Deve ser configurada de forma atômica e persistente no `/etc/config/network`.
3. **Conflito Flow Offloading vs SQM**:
   - Software/Hardware Flow Offloading bypassa as filas do Linux e impede o controle de bufferbloat do SQM (CAKE / FQ-CoDel). O ARK Router deve priorizar ou conciliar de forma segura.

---

## 3. Utilitário ARK Doctor (Auditoria e Auto-Cura)
- **Comando CLI**: `/usr/sbin/ark-doctor`
- **Comando Backend RPC**: `/usr/sbin/equipe-dashboard-control audit-system [--fix]`
- **Itens Auditados**:
  - Memória RAM livre (> 128 MB / > 256 MB).
  - Espaço livre no `/overlay` (> 2 MB).
  - Associação correta do SQM com L3 em PPPoE.
  - Persistência de MTU 1508 em Baby Jumbo Frames.
  - Conflitos de Flow Offload vs SQM.
- **Auto-Cura (`--fix`)**:
  - Corrige automaticamente interfaces SQM órfãs e recarrega os serviços.
