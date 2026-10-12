### Novidades e Destaques do ARK Router v1.5.15

• **🚀 Checador Inteligente de Nova Versão & Diagnóstico de Espaço em Disco**:
  - **Checagem em Segundo Plano com Cache Duplo**: Execução não intrusiva com cache de 12 horas no backend (`/tmp/ark-router-update-check.json`) e throttling no frontend (`localStorage`), evitando requisições desnecessárias.
  - **Banner Dinâmico com Opção de Ocultar**: Notificação visual sutil logo abaixo do Hero, com botão "Ocultar ✕" que persiste por versão no navegador.
  - **Modal Completa de Confirmação & Changelog**: Exibição da versão instalada vs nova versão (`v{current}` ➔ `v{latest}`), pacote de destino (`.apk`/`.ipk`) e lista detalhada de novidades.
  - **Ponto de Corte de Armazenamento no Limite Físico (650 KB)**: Diagnóstico visual de espaço na partição Flash (`/overlay`) e RAM (`/tmp`). Se o espaço livre for inferior a 650 KB, o sistema alerta e bloqueia a gravação para evitar corrupção do JFFS2/UBIFS, oferecendo botão para purgar a flash. Entre 650 KB e 1200 KB, emite aviso de margem estreita e prossegue substituindo os arquivos.
  - **Garantias de Blindagem**: Backup automático de configurações antes do update, preservando 100% das senhas, regras de firewall e redes Wi-Fi sem queda de conexão.

• **⚖️ Blindagem Multicore de Interrupções (IRQ Balance)**:
  - Detecção nativa em nível de silício para MediaTek Filogic (WED/PPE) e Qualcomm IPQ/NSS. O toggle manual é protegido e substituído por selo verde Nativo por Hardware com anéis de DMA dedicados.

• **🎛️ Toggles Inteligentes no Card Principal "Desempenho & Blindagem de Memória"**:
  - Controles de Compressão de Memória RAM (ZRAM / LZ4) e Abertura Automática de Portas (UPnP / IGD) diretamente no card principal do dashboard com feedback em tempo real.

• **🌐 Internacionalização Tripla (i18n)**:
  - 100% de cobertura e paridade estrita nos 3 idiomas suportados: Português do Brasil (PT-BR), Inglês (EN) e Espanhol (ES).
