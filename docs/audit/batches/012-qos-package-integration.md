# Lote 012 — dependências e fallback de módulos QoS (05/11/2026)

## Escopo e decisão

Integração de componentes runtime, não plugins/skills de desenvolvimento. CAKE e HFSC continuam disponíveis em Lite e Full. O conjunto padrão passa a declarar explicitamente `tc-full`, `sqm-scripts`, `kmod-ifb`, `kmod-sched-core` e `kmod-sched-cake`, mais `kmod-sched-ctinfo`. `sched-core` fornece os schedulers/classificadores usados pelo HFSC/FQ-CoDel e pelas ações de redirecionamento/priority. O kernel deve receber os módulos do repositório correspondente; não copiar módulos de outra imagem/kernel.

`ARK_QOS_WITH_CTINFO=0` é uma opção explícita de empacotamento para alvos sem pacote ctinfo compatível/confiável. Ela omite a dependência direta, não desinstala módulo existente nem desabilita um módulo já disponível. Sem ctinfo, o SQM básico continua, com aviso da ausência de restauração DSCP bidirecional. A escolha 0/1 é validada, não inferida pelo hardware do computador que gera o pacote. As dependências transitivas continuam sob responsabilidade do feed/gerenciador do alvo.

Não adicionar `pedit`/`csum` ou o pacote amplo `kmod-sched`: o código atual não usa essas ações. Se a correção futura de classificação precisar delas, declarar e verificar o pacote que as contém na versão do alvo. Não antecipar inclusão pesada nem prometer classificação resolvida pela simples instalação de ctinfo.

## Fonte única de dependências QoS

Makefile declara `ARK_QOS_BASE_DEPENDS`, `ARK_QOS_CTINFO_DEPENDS` e a seleção padrão. As duas definições Lite/Full referenciam o conjunto resolvido. `scripts/qos_package_deps.py` lê essas mesmas listas, valida a opção e acrescenta as dependências aos quatro empacotadores:

- `build-ipk-mac.py` e `build-ipk-wsl.sh`;
- `build-apk-mac.py` e `build-apk-manual-wsl.sh`.

Os IPK locais antes declaravam apenas dependências básicas LuCI, omitindo as necessidades do runtime QoS. Agora declaram o conjunto compartilhado. As demais dependências históricas de cada gerador foram preservadas: esta entrega não afirma paridade de todos os módulos do produto.

`ARK_PACKAGE_OUTPUT_DIR` permite gerar os candidatos em diretório separado, preservando artefatos anteriores em dist. Não houve alteração de versão, commit, push, upload ou instalação dos pacotes gerados.

Exemplos (gerar em diretório próprio de candidatos):

```sh
ARK_QOS_WITH_CTINFO=1 ARK_PACKAGE_OUTPUT_DIR=/tmp/ark-candidates-ipk python3 scripts/build-ipk-mac.py
ARK_QOS_WITH_CTINFO=0 ARK_PACKAGE_OUTPUT_DIR=/tmp/ark-candidates-ipk-reduced python3 scripts/build-ipk-mac.py
```

Os geradores APK e shell aceitam as mesmas duas variáveis. O SDK aceita a seleção Makefile `ARK_QOS_WITH_CTINFO=0` ou 1.

## Runtime e fallback

A biblioteca comum agora prepara e tenta instalar filtros ctinfo para IPv4 e IPv6. Detecta presença no ARK_ROOT correto, tenta carregar o módulo e confirma o retorno de TC. Se houver falha parcial, remove somente os dois filtros ctinfo pertencentes à chamada; não remove a regra de redirect de prioridade 10 nem as raízes de shaping. Registra aviso e retorna falha ao chamador. CAKE/HFSC conservam o shaper e seguem sem restauração ctinfo quando essa integração opcional está indisponível. Os limites de tamanho dos filtros HFSC anteriores foram preservados; o lote não reescreveu a política de classificação.

`ark_has_ctinfo` usa a biblioteca comum e deixa de consultar marcadores reais do hospedeiro quando ARK_ROOT aponta para sandbox. A presença do módulo ainda não comprova comportamento de pacotes/classificação: o relatório de recursos mantém `capabilities_validated=false`.

## Validação

- 7 métodos de metadados: conjunto padrão, opt-out, opção inválida, ausência de dependências não utilizadas, deduplicação e preservação de dependências opkg/APK; avaliação real do Makefile com make/stubs SDK confirma Lite e Full nas duas seleções. Isso não é compilação completa em SDK alvo.
- 20 métodos de recursos, incluindo módulo ausente, módulo carregado, falha de carregamento, instalação IPv4/IPv6 parcial com limpeza e preservação da seleção HFSC por tamanho. Caminho positivo ctinfo usa TC mockado.
- 28 métodos de confiabilidade e runner completo aprovados (inclui shell, WAN, preservação, contratos, docs, i18n estrito, CODE_MAP e minificação). Suíte separada de hardware e VM não executadas neste lote; não reclassificar falhas históricas como aprovadas.
- Gerados localmente pelos builders Mac: **8 candidatos principais** (Lite/Full × IPK/APK × padrão/reduzido). O inspetor `tests/inspect_qos_packages.py` conferiu dependências nos metadados dos arquivos gerados; ctinfo presente só no padrão; biblioteca e script HFSC presentes. IPK também comparado byte a byte com as duas fontes. APK conferido pela árvore de conteúdo de `adbdump`, sem instalar/extrair no roteador. Os candidatos não são homologação de assinatura, permissões/ownership global ou instalação integral do produto.
- Geradores WSL: sintaxe bash validada e integração com o resolvedor comum revisada; não foram executados em Windows/WSL nem geraram APK via SDK Linux nesta sessão.
- Kernel W6x em IFB temporário: CAKE 32M e árvore HFSC 8/16/8 MiB verificados; duas WANs e RAM fornecidas por UCI/proc isolados, não Dual-WAN física. Falta real de ctinfo retornou o fallback esperado, preservando a árvore. Configurações de produção conferidas intactas e IFB removido.

Repetir a inspeção da matriz gerada:

```sh
python3 tests/inspect_qos_packages.py --directory '../../Evidencias locais/QoS-012-2026-11-05' --apk-tool /caminho/do/apk
```

## Aplicação no 73.1

Biblioteca/runtime atualizados após conferir hashes anteriores, sintaxe e identidade, sob trava, com backup de retorno e cópia verificada no Mac. Quatro arquivos copiados, sendo `common.sh` idêntico ao lote 011. Três fontes efetivamente alteradas. Retorno zero; hashes de UCI sqm/firewall/equipe_dashboard e qdiscs da WAN/IFB idênticos. Sem restart SQM ou alteração das taxas 720/620 Mb/s, sem mudança de motor. Nenhum pacote de kernel foi instalado.

Backup: `Evidencias locais/QoS-012-2026-11-05/backup.tar.gz`, SHA-256 `f1d131da7e01c30b5e4a485b0f2cd648fc9a8cb882db6ed4126de55a694a153d`. Para retorno, restaurar os quatro arquivos e config sqm do backup, conferindo hashes anteriores; o lote não exige restart porque as filas não foram alteradas.

| Arquivo | SHA-256 aplicado |
|---|---|
| `/usr/lib/ark/qos-resources.sh` | `b038dad8ba74e527d70591ebf3fddb6174840b970325e8dde31cc60f23419787` |
| `/usr/lib/ark/common.sh` | `29d8e7369b0abe74be88aa519b24f436ff5108e9f3178d4b2777d04116e1e5b7` |
| `/usr/lib/ark/modules/sqm.sh` | `d306fe97b16a53aeb83280651213b30499eadaadf4e3d316e7509e11e5990642` |
| `/usr/lib/sqm/ark_hfsc_fqcodel.qos` | `68c40b7781f74af0ff8a0ce5c80110421af55cfba1e5b90c39920f94d7ef2c96` |

Verificação repetida nesta etapa: `apk verify` ainda retorna `UNTRUSTED signature` para o pacote ctinfo baixado. `apk info -e kmod-sched-ctinfo` retorna 1 (ausente). Não foram alteradas chaves nem contornada a validação. Assim, a integração **está empacotada**, mas ctinfo **não está instalado nem homologado no W6x**. A prioridade efetiva dos pacotes permanece assunto do próximo lote de classificação bidirecional.

## Fontes primárias e limites

Foram conferidas as definições de `sched-core` e `sched-ctinfo` em [OpenWrt 19.07](https://github.com/openwrt/openwrt/blob/openwrt-19.07/package/kernel/linux/modules/netsupport.mk), [21.02](https://github.com/openwrt/openwrt/blob/openwrt-21.02/package/kernel/linux/modules/netsupport.mk) e [main](https://github.com/openwrt/openwrt/blob/main/package/kernel/linux/modules/netsupport.mk). A existência da definição não prova pacote pronto para cada firmware OEM. O mapeamento/dependências transitivas de módulos variam conforme a branch; não invocar comandos fw3/iptables no caminho fw4. A integração desta entrega não manipula regras de firewall.

Sem prova de reboot, partida, instalação do produto via opkg/APK ou ctinfo positivo no kernel do W6x. Calibração por CPU, confiança ingress, classificação por conexão e controlador Autorate real seguem pendentes.

## Atualização posterior — lote 013

A conclusão de bloqueio baseada somente na assinatura do arquivo isolado foi corrigida. O pacote foi instalado pelo repositório sem contornar verificações, carregado e exercitado no kernel real. O APK ainda reporta um erro residual não isolado. Ver [instalação e correção do diagnóstico](013-ctinfo-installed-native.md). Este histórico preserva o que havia sido testado na etapa anterior.
