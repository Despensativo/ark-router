# Lote 029 — atualização visual após ações

Data: 07/11/2026. Escopo: código fonte atual em `src/core/` e `src/modules/`, 23 recursos da `FEATURE_META` (19 com alternância, 14 removíveis) e os caminhos de ação dos 15 módulos de frontend. Esta é uma revisão de sincronização visual, sem mudança de comportamento de produção.

## Resultado

O painel tem três mecanismos em paralelo: atualização periódica dos dados operacionais a cada 2–5 s (`lifecycle.js:scheduleAdaptiveRefresh`), sincronização imediata de capacidades e dados (`triggerImmediateRefresh`) e recarga integral (`location.reload`). Os controles não usam um contrato único de estado. Há ações que atualizam badges e chaves sem recarregar, mas a alternância central de todos os 19 recursos sempre aguarda uma recarga integral para refletir a mudança. Os casos abaixo impedem considerar todos os cenários corretos.

| Prioridade | Achado e mecanismo | Cenário observável | Fonte |
|---|---|---|---|
| P1 | A ativação, desativação e remoção na Central de Recursos agendam `location.reload()` após resposta RPC bem sucedida. O objeto `f` muda em memória, mas a linha, botão e badge do modal não são reconstruídos. O usuário vê “Recarregando…” e depende da navegação integral. | 19 recursos alternáveis; 14 removíveis. Uma falha de recarga deixa a tela antiga até nova visita. | `system.js:3145–3233`, `system.js:2737–2880` |
| P1 | `triggerImmediateRefresh()` captura qualquer erro e resolve a Promise. `reloadSoon()` interpreta essa resolução como sincronização concluída, libera a trava e não executa as tentativas de novo nem a alternativa final. | RPC de status indisponível enquanto Wi-Fi/rede reinicia: o aviso diz que a mudança foi aplicada, mas o visual pode permanecer no estado anterior indefinidamente. | `lifecycle.js:106–125`, `formatters.js:518–550` |
| P1 | As capacidades têm cache em memória sem expiração durante a sessão. O polling atualiza `fetchData`, mas não consulta `features`. Mesmo quando o cache de sessão dispara leitura assíncrona, o resultado não reatribui `this.capabilities` nem redesenha os recursos. | Serviço alterado por outra aba, SSH, reboot ou instalador: a Central, as barras e os badges derivados de `feature()` podem continuar antigos até recarga ou refresh forçado por uma ação local. | `lifecycle.js:4–84`, `lifecycle.js:532–560`, `lifecycle.js:80–85` |
| P2 | `render()` constrói cartões para redes Wi-Fi adicionais e WANs existentes apenas na montagem inicial; `updateWifi()` só altera nós que já existem. `reloadSoon()` usa hot refresh quando há instância ativa. | Criar/excluir SSID, converter porta WAN ou mudar topologia pode atualizar dados internos sem inserir/remover os cartões correspondentes. | `render.js:252–280`, `render.js:464`, `wifi.js:23–28`, `wifi.js:278,951`, `formatters.js:518–550` |
| P2 | A classificação de desconexão esperada usa apenas palavras no erro de rede/timeout. Não lê o estado no destino antes de anunciar “Comando enviado” e sincronizar. | Uma falha antes de chegar ao roteador pode parecer aplicação bem sucedida; uma aplicação efetiva com resposta perdida pode reverter a chave temporariamente. | `formatters.js:551–557`, `wifi.js:326–357` |
| P2 | Alternâncias específicas de AdBlock e Speedify também usam recarga integral depois do sucesso, embora alterem estados exibidos no painel. Instalações, tema, idioma e atualização podem justificar navegação completa por trocar estrutura ou assets. | Alternâncias comuns piscam a página e perdem contexto do modal/scroll. | `adblock.js:25–45`, `speedify.js:76–139`, `system.js:740–755,963–987` |

## Matriz de caminhos examinados

| Grupo | Mecanismo atual | Conclusão da revisão |
|---|---|---|
| Central de Recursos: 23 entradas, incluindo SQM, Multi-WAN, VPN, KSMBD, WoL, serviços nativos | 19 alternâncias e 14 remoções passam por `toggleFeatureState` / `removeFeature` | Dependência de recarga integral confirmada; não atende atualização imediata sem navegação. |
| Instalação de recurso e instalação em lote | Poll de status/progresso, seguido de recarga | Progresso é mostrado; recarga final é coerente para mudanças de pacote, mas falha/timeout precisa de reconciliação. |
| Wi-Fi: rede, WPS, roaming, usteer, Wi-Fi 6/7, MLO e potência | Chave desabilitada durante RPC; badge/summary atualizados localmente ou por polling; criação/remoção usa `reloadSoon` | Alternâncias simples têm resposta visual. Mudança de lista/topologia não é reconstruída pelo hot refresh. |
| SQM, WAN, Multi-WAN, firewall/UPnP e modos de rede | Mistura de hot refresh, `fetchData().then(update)` e `reloadSoon` | Indicadores existentes tendem a atualizar; cartões adicionados/removidos e estados de capacidade têm risco de desatualização. |
| AdBlock e Speedify | Alternância principal com recarga; outras opções com estado local | Comportamento inconsistente entre controles do mesmo recurso. |
| WireGuard, ZeroTier e Doctor/ajustes de desempenho | Predomina `triggerImmediateRefresh`; duas ações de Doctor recarregam | Caminho rápido existe, mas herda a falha silenciosa de sincronização. |
| KSMBD e WoL | Consultas próprias de status e atualização dos resumos do cartão | Melhor independência da recarga para ações dentro desses cartões; capacidade geral ainda pode ficar antiga. |
| Starlink, dispositivos, Speedtest e EZ Setup | Atualização local/poll em Starlink, dispositivos e medição; recargas em partes de dispositivos e setup | Fluxos mistos; as ações que exigem reiniciar serviços/topologia não têm critério compartilhado de reconciliação. |
| Tema, idioma, instalação e atualização do ARK | Recarga/navegação | Recarga pode ser necessária para carregar novos assets, tradução ou rota; manter como exceção explícita. |

## Verificações executadas e limites

- Teste Node com métodos originais em VM JavaScript e RPC simulado: ativar SQM na Central agendou recarga integral; desativar abriu confirmação; falha de `triggerImmediateRefresh` produziu aviso no console mas a Promise resolveu sem atualizar a interface; cache de capacidades retornou dado antigo sem RPC; alternância Wi-Fi atualizou o badge sem recarga.
- Chrome for Testing 153 headless, viewport 360×900, fixture local com `systemMethods.toggleFeatureState` original e RPC simulado: o DOM após a ação registrou uma segunda carga da página e zero erros JavaScript capturados. A captura está em `../evidence/029-ui-refresh/fixture-toggle-success-360.png`. É uma prova do fluxo de recarga, não uma sessão LuCI real.
- VirtualBox indisponível neste host: o lançador `/usr/local/bin/VBoxManage` aponta para `/Applications/VirtualBox.app/Contents/MacOS/VBoxManage`, que não existe. Sem teste em VM, sem alteração ou acesso a roteador físico. Não há conclusão sobre latência real de serviço, perda de conexão ou comportamento de rádio/hardware.
- Nenhum arquivo de produção foi alterado. As mudanças locais preexistentes em backend, testes e `docs/CODE_MAP.md` foram preservadas.

## Correção recomendada para próximo lote

1. Fazer `triggerImmediateRefresh` rejeitar falhas de leitura, manter indicação “sincronizando” e confirmar estado real antes de marcar conclusão. Dar timeout controlado e ação de recuperação quando o equipamento ficar inacessível.
2. Invalidar/refazer capacidades depois de cada mutação e quando a aba voltar ao primeiro plano; reconciliar estado do botão, badge, barra de ciclo de vida e Central a partir da resposta, sem mutação otimista irreversível.
3. Usar refresh de dados para valores existentes e reconstrução localizada para listas/cartões de Wi-Fi, WAN e recursos. Preservar recarga integral apenas quando assets, idioma, tema ou rota mudarem.
4. Testar sucesso, falha RPC, timeout antes/depois da aplicação, resposta perdida, ação em outra aba, aba oculta, mudança estrutural e alteração de IP em VM, com screenshot desktop/mobile, console e estado backend. Repetir no hardware real apenas mediante pedido específico.
