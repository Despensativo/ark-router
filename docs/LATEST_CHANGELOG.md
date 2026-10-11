### Novidades e Destaques do ARK Router v1.5.14

• **Toggles Inteligentes no Card Principal "Desempenho & Blindagem de Memória"**:
  - Os controles de Compressão de Memória RAM (ZRAM) e Abertura Automática de Portas (UPnP / IGD) agora estão integrados como switches interativos de primeiro nível diretamente no card principal do dashboard.
  - Indicadores dinâmicos de status em tempo real, badges informativos coloridos e persistência segura em tempo de execução.

• **🗜️ Compressão de Memória RAM Inteligente (ZRAM / LZ4)**:
  - Cria disco virtual de swap comprimido na RAM com algoritmo LZ4 ultrarrápido, duplicando a capacidade efetiva sem desgaste na memória Flash.
  - Trava de Segurança de 5 Segundos: Em roteadores com 512 MB ou mais de RAM física, o switch exige confirmação temporizada de 5s para evitar gasto desnecessário de ciclos de CPU em equipamentos de ponta.
  - Modo Protegido para CPUs Mononúcleo (MIPS): Detecta processadores modestos e limita o disco a 32 MB com swappiness=15, evitando gargalo de processamento.
  - Ativação Imediata: Em roteadores multicore com até 256 MB (ex: Cudy WR3000), opera nativamente com alocação otimizada (116 MB LZ4).

• **🎮 Blindagem de Portas WAN (UPnP / IGD)**:
  - Modo Seguro (Padrão): Mantém portas WAN protegidas contra abertura arbitrária e não autorizada por aplicativos na rede local.
  - Modo Dinâmico: Permite abertura sob demanda para consoles (Xbox/PlayStation) com alertas visuais explícitos de segurança e atualização imediata do contador de otimizações.

• **⚖️ Blindagem Multicore de Interrupções (IRQ Balance)**:
  - Detecção nativa em nível de silício para MediaTek Filogic (WED/PPE) e Qualcomm IPQ/NSS. O toggle manual é protegido e substituído por selo verde Nativo por Hardware com anéis de DMA dedicados.

• **🩺 Ark Doctor (Auditoria & Autocura)**:
  - Adicionado teste de integridade da ZRAM (Check 1b: Coerência de ZRAM) com verificação de montagem LZ4 em /dev/zram0 e autocura de vm.swappiness.
  - Diagnóstico em tempo de execução 100% aprovado (0 erros, 0 avisos).

• **🌐 Internacionalização Tripla (i18n)**:
  - 100% de cobertura e paridade estrita nos 3 idiomas suportados: Português do Brasil (PT-BR), Inglês (EN) e Espanhol (ES).
