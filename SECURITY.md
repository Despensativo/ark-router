# Política de Segurança — ARK Router

## 1. Versões Suportadas

O suporte oficial e patches de segurança são mantidos para as versões ativas do ecossistema ARK Router:

| Versão | Suportada | Notas de Compatibilidade |
|---|:---:|---|
| `v2.2.2+` | ✅ Sim | Versão ativa de produção (`fw4`/nftables e `fw3`/iptables) |
| `v2.1.x` | 🔄 Suporte Limitado | Atualização recomendada para `v2.2.2` |
| `< v2.0.0` | ❌ Não | Obsoleta; migração necessária |

---

## 2. Reporte de Vulnerabilidades

Caso identifique uma vulnerabilidade ou risco de segurança no ARK Router:
1. **Não abra uma Issue pública** no GitHub.
2. Comunique os mantenedores através dos canais de suporte privado ou security advisories do GitHub.
3. Forneça relatório detalhado com:
   - Versão do ARK Router e versão exata do OpenWrt (`/etc/openwrt_release`).
   - Modelo de hardware (ex: Acer Predator Connect W6x, Predator T7, Cudy WR3000 v1, D-Link DGL-5500).
   - Passos reprodutíveis, rotas LuCI RPC ou parâmetros ubus envolvidos.
   - Prova de conceito (PoC) sem credenciais reais ou dados privados.

---

## 3. Diretrizes de Segurança do Firmware e Runtime

### Isolamento de Firewall (`fw4` vs `fw3`)
- No OpenWrt moderno (`22.03+` com `fw4`/nftables), todo o tráfego é filtrado nativamente em tabelas nftables. É proibida a instanciação de regras `iptables` obsoletas no kernel via wrappers.
- No OpenWrt legado (`19.07` a `21.02` com `fw3`/iptables), regras legadas são encapsuladas e validadas contra injeção de parâmetros.

### Prevenção de Injeção de Comandos (POSIX Ash & LuCI RPC)
- Todas as chamadas de sistema (`sys.exec`, `fs.exec`, `uci`) utilizam sanitização estrita de variáveis com aspas duplas e validação de padrões (regex) para endereços IP, MACs, nomes de interface e identificadores.
- Chamadas JSON-RPC e ubus respeitam as ACLs declaradas em `/usr/share/rpcd/acl.d/luci-app-ark-router.json`.

### Proteção de Memória Flash (MTD / NAND Wear-Leveling)
- Logs, contadores de tráfego temporários e buffers de telemetria operam estritamente em Ramdisk (`/tmp/` ou `/var/run/`).
- O daemon de histórico de tráfego (`equipe-traffic-history`) monitora a partição `/overlay` e suspende gravações persistentes se o espaço livre for inferior ou igual a 1.024 KB.
- **Proteção Crítica de Hardware**: É terminantemente proibido gravar partições de bootloader (`mtd14`/`mtd15`) no Acer Predator Connect T7 ou em qualquer equipamento real sem conexão UART serial física validada.

### Salvaguarda para Agentes de IA e Automação
- Agentes de IA jamais devem aplicar alterações, atualizar firmware ou disparar reboots em roteadores físicos (`192.168.73.1`) sem solicitação explícita do usuário.
- O ambiente primário de validação é a infraestrutura virtualizada isolada (UTM no macOS ou VirtualBox no Windows).
