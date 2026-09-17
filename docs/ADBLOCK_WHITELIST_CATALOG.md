# Catálogo Oficial de Whitelist e Liberações — ARK Router

Este documento registra oficialmente todos os domínios pré-liberados (*whitelisted*) de fábrica no ecossistema **ARK Router**, bem como o histórico de todas as liberações manuais realizadas durante testes e diagnósticos operacionais.

---

## 1. Visão Geral e Filosofia de Liberação
O módulo de bloqueio de anúncios e ameaças do ARK Router (AdGuard Home / Dnsmasq) utiliza listas consolidadas globais e brasileiras. No entanto, filtros agressivos frequentemente classificam serviços essenciais de autenticação, anti-fraude, streaming ou CDN como "rastreadores" ou "telemetria", quebrando o funcionamento de aplicativos legítimos.

Para garantir que a experiência do usuário seja impecável ("Plug & Play"), o ARK Router mantém uma **Whitelist Curada Oficial** com prioridade `$important` (sobrepondo qualquer lista negra de terceiros).

---

## 2. Categorias e Domínios Liberados Atualmente

### 2.1. Telecomunicações & Operadoras Brasileiras
> **Motivo:** Aplicativos de operadoras no smartphone (iOS e Android) realizam autenticação, carregamento de faturas e personalização do dashboard via plataformas externas que são falsamente bloqueadas por adblockers.

| Domínio | Serviço / Finalidade | Causa da Inclusão |
| :--- | :--- | :--- |
| `claro.com.br` | Portal, área do cliente e autenticação Claro | Domínio institucional |
| `clarobrasil.mobi` | API móvel de dados e pacotes | App Minha Claro móvel |
| `clarotvmais.com.br` | Streaming Claro tv+ | Reprodução de vídeo e grade de canais |
| `clarosa.us-5.evergage.com` | Salesforce Personalization / Evergage da Claro S.A. | **Essencial**: o app Minha Claro no iPhone trava sem ele |
| `cdn.evergage.com` | Assets e componentes de tela da Salesforce | Carregamento visual do app Minha Claro |
| `vivo.com.br` | Portal e login Vivo | Domínio institucional |
| `meuvivo.com.br` | Área do cliente e faturas Vivo | App Meu Vivo |
| `tim.com.br` | Portal e recargas TIM | Domínio institucional |
| `meutim.com.br` | Área do cliente e consumo TIM | App Meu TIM |

---

### 2.2. Ecossistema Amazon & Alexa
> **Motivo:** Caixas de som inteligentes (Echo Dot, Echo Pop, Echo Studio, Echo Show) realizam checagens constantes com a nuvem da AWS. Se a telemetria ou canais AVS forem bloqueados, o anel de LED fica vermelho e os comandos de voz falham.

| Domínio | Finalidade |
| :--- | :--- |
| `amazon.com` / `amazon.com.br` | Loja, autenticação de conta e serviços centrais |
| `amazonalexa.com` | API principal do serviço Alexa Voice Service (AVS) |
| `alexa.amazon.com` | Painel web e endpoints de configuração Alexa |
| `a2z.com` / `devices.a2z.com` | Infraestrutura interna de provisionamento de dispositivos físicos Amazon |
| `amazon.dev` | Endpoints de configuração de dispositivos e sincronização do app Alexa |
| `aws.dev` | Diagnósticos de rede AWS (`web.diagnostic.networking.aws.dev`) |
| `apl-alexa.com` | Alexa Presentation Language (telas, cards e respostas visuais/áudio) |
| `d3p8zr0ffa9t17.cloudfront.net` | **Distribuição CloudFront crítica para comandos de voz da Alexa** (bloqueada por engano em listas de anúncios) |
| `amazonaws.com` | Nuvem global AWS |
| `s3.amazonaws.com` | Armazenamento de arquivos de áudio, skills e respostas de voz |
| `media-amazon.com` / `m.media-amazon.com` | Capas de álbuns, mídias e chunks de áudio do Amazon Music |
| `avs-alexa-na.amazon.com` / `avs-alexa-eu.amazon.com` / `avs-alexa-fe.amazon.com` | Endpoints de áudio bidirecional e reconhecimento de voz |
| `ntp-g7g.amazon.com` | Sincronização de horário de alta precisão dos dispositivos Echo |
| `alexa-hybrid-interaction-log-config-prod-na.s3.amazonaws.com` | Sincronização de comandos híbridos da Alexa |
| `device-metrics-us.amazon.com` | Métricas de integridade de hardware dos dispositivos Echo |
| `device-metrics-us-2.amazon.com` | Métricas secundárias de conectividade dos dispositivos Echo |

---

### 2.3. Smart TVs & Dispositivos de Streaming
> **Motivo:** Fabricantes de Smart TV utilizam servidores de verificação de firmware e inicialização das lojas de aplicativos que adblockers costumam marcar como telemetria.

| Domínio | Fabricante / Plataforma | Finalidade |
| :--- | :--- | :--- |
| `samsungcloudsolution.com` | Samsung Smart TV (Tizen OS) | Conexão com a nuvem Samsung Account |
| `samsungcloudsolution.net` | Samsung Smart TV (Tizen OS) | Loja de apps Samsung Apps e atualizações |
| `samsungqbe.com` | Samsung Smart TV | Inicialização do Smart Hub |
| `lgtvcommon.com` | LG Smart TV (webOS) | Autenticação LG ThinQ / LG Content Store |
| `lgtvsdp.com` | LG Smart TV (webOS) | Download e execução de apps na LG TV |
| `lgappstv.com` | LG Smart TV (webOS) | Catálogo de aplicativos da LG |
| `roku.com` | Roku OS / Roku Express | Ativação do dispositivo, canais e controle remoto via app |

---

### 2.4. Bancos & Fintechs Nacionais (Brasil)
> **Motivo:** Apps de bancos realizam verificação de fraude e tokens criptográficos no arranque. O bloqueio resulta em "Erro de conexão", travamento no splash screen ou falha ao ler biometria.

| Domínio | Instituição |
| :--- | :--- |
| `bb.com.br` | Banco do Brasil |
| `itau.com.br` | Itaú Unibanco / Íon / Iti |
| `bradesco.com.br` | Banco Bradesco / Next / Ágora |
| `santander.com.br` | Santander Brasil / Way |
| `nubank.com.br` | Nubank |
| `inter.co` / `bancointer.com.br` | Banco Inter |
| `c6bank.com.br` | C6 Bank |
| `mercadopago.com.br` | Mercado Pago |
| `pagseguro.uol.com.br` | PagBank / PagSeguro |
| `picpay.com` | PicPay |

---

### 2.5. Governo Federal & Serviços Públicos
> **Motivo:** Emissão de certidões, Conectividade Social da Caixa Econômica e login GOV.BR utilizam domínios e redirecionamentos sensíveis.

| Domínio | Serviço |
| :--- | :--- |
| `gov.br` / `acesso.gov.br` | Login Único Federal (GOV.BR) |
| `serpro.gov.br` | Infraestrutura tecnológica do governo |
| `dataprev.gov.br` | Previdência Social / Meu INSS |
| `receita.fazenda.gov.br` / `fazenda.gov.br` | Receita Federal do Brasil (IRPF, e-CAC) |
| `conectividade.caixa.gov.br` / `caixa.gov.br` | Conectividade Social ICP, FGTS e Caixa |

---

### 2.6. Ecossistema Apple & iOS
> **Motivo:** Download de apps na App Store, sincronização do iCloud, atualizações de segurança OTA e protocolo de tempo (NTP) de relógio do iPhone/iPad.

| Domínio | Finalidade |
| :--- | :--- |
| `apple.com` / `icloud.com` | Portais e sincronização de dados |
| `itunes.com` / `itunes-apple.com` / `mzstatic.com` | App Store, capas, trailers e downloads |
| `aaplimg.com` / `cdn-apple.com` | Redes de distribuição de mídia da Apple |
| `apple-dns.net` | Resolução interna de balanceamento de carga Apple |
| `swcdn.apple.com` / `updates.cdn-apple.com` | Atualizações de software (iOS / macOS / iPadOS) |
| `time-ios.apple.com` / `time.apple.com` | Sincronização de horário de alta precisão |

---

### 2.7. Ecossistema Google, Android & Push
> **Motivo:** Acesso à Google Play Store, verificação Play Integrity (exigida por apps bancários no Android) e push notifications pelo Firebase Cloud Messaging (FCM).

| Domínio | Finalidade |
| :--- | :--- |
| `play.google.com` | Google Play Store |
| `android.clients.google.com` | Serviços do Google Play no Android |
| `gvt1.com` / `gstatic.com` | Servidores estáticos e downloads do Google |
| `googleapis.com` | APIs fundamentais de autenticação e mapas |
| `deviceintegritytokens.googleapis.com` | Verificação de integridade contra root/adulteração para bancos |
| `fcm.googleapis.com` | Notificações push em tempo real no Android |

---

### 2.8. Mensageria & Redes Sociais
> **Motivo:** Garante envio e download de arquivos multimídia (fotos, vídeos, áudios) sem gargalos.

* `whatsapp.com`, `whatsapp.net`, `cdn.whatsapp.net`, `fbcdn.net`

---

### 2.9. Streaming, Mídia & E-commerce
* `globo.com`, `globoplay.com.br`
* `netflix.com`, `nflxvideo.net`
* `mercadolivre.com.br`, `ifood.com.br`

---

### 2.10. Gaming, Lojas & CDNs Globais
* `github.com`, `githubassets.com`, `githubusercontent.com`, `github.io`, `githubstatus.com`
* `steamcommunity.com`, `steampowered.com`, `epicgames.com`, `accounts.nintendo.com`
* `edgekey.net`, `akamaiedge.net`, `fastly.net`, `jsdelivr.net`
* `fast.com`, `speedtest.net`, `plex.tv`, `roborock.com`

---

## 3. Liberações Manuais Específicas (Histórico de Atendimentos)

Além dos pacotes de fábrica, este ambiente registra liberações manuais pontuais solicitadas pelo usuário:

1. **Plataforma IPTV / Streaming Privado (ClubeVIP)**:
   * Regras adicionadas:
     * `@@||clubevip.net^$important`
     * `@@||*.clubevip.net^$important`
     * `@@||www.clubevip.net^$important`
     * `@@||216.183.246.223^$important`
   * *Diagnóstico:* Evita bloqueio da rota do player e CDN do provedor de stream.
2. **App Minha Claro (iPhone / iOS) — Caso Evergage**:
   * Regras adicionadas:
     * `@@||clarosa.us-5.evergage.com^$important`
     * `@@||cdn.evergage.com^$important`
     * `@@||claro.com.br^$important`
     * `@@||clarobrasil.mobi^$important`
   * *Diagnóstico:* O AdGuard bloqueava o domínio `evergage.com` pela regra `||evergage.com^` do filtro principal. Sem ele, a SDK do app no iPhone não inicializava os dados do assinante e travava.
3. **Comandos de Voz da Amazon Alexa — Caso CloudFront & Amazon Dev**:
   * Regras adicionadas:
     * `@@||d3p8zr0ffa9t17.cloudfront.net^$important`
     * `@@||amazon.dev^$important`
     * `@@||aws.dev^$important`
     * `@@||apl-alexa.com^$important`
     * `@@||m.media-amazon.com^$important`
     * `@@||ntp-g7g.amazon.com^$important`
   * *Diagnóstico:* O filtro AdGuard Base continha a regra `||d3p8zr0ffa9t17.cloudfront.net^`. No momento exato em que a caixa Echo recebia o comando de voz, tentava se comunicar com essa distribuição CloudFront e com `web.diagnostic.networking.aws.dev`. Como recebia `0.0.0.0`, o dispositivo falhava em processar a fala e disparava erros no Bugsnag. A liberação restaura o processamento normal de voz.

---

## 4. Como o ARK Router Aplica Essas Regras
As regras de permissão prioritária são aplicadas com a sintaxe padrão AdGuard / uBlock:
```text
@@||dominio.com^$important
```
* O prefixo `@@||` indica liberação com casamento em qualquer subdomínio (`*.dominio.com` e `dominio.com`).
* O modificador `$important` garante que a regra de permissão vença **qualquer regra de bloqueio** existente em listas de terceiros (como AdGuard Base, OISD, EasyList).
