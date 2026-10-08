#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

theme_path = os.path.abspath("root/www/luci-static/ark/ark-theme.js")
with open(theme_path, "r", encoding="utf-8") as f:
    text = f.read()

replacement = """      } else if (path.indexOf('/network/network') !== -1) {
        guide = {
          title: isEn ? 'Connection Guide: WAN (Internet) & LAN (Local Network)' :
                 (isEs ? 'Guía de Conexión: WAN (Internet) y LAN (Red Local)' :
                         'Guia de Conexão: WAN (Internet) e LAN (Rede Local)'),
          serve: isEn ? 'The WAN interface receives internet signal from your ISP modem or fiber ONT. The LAN interface distributes that connection to wired and Wi-Fi devices.' :
                 (isEs ? 'La interfaz WAN recibe la señal de internet del módem o fibra del operador. La interfaz LAN distribuye esa conexión a los equipos conectados por cable y Wi-Fi.' :
                         'A interface WAN recebe o sinal de internet do modem ou fibra da operadora. A interface LAN distribui essa conexão aos aparelhos conectados por cabo e Wi-Fi.'),
          fazer: isEn ? 'If internet drops, click "Restart" on the WAN interface to restore connection with your ISP. To change device IP range, edit the LAN interface.' :
                 (isEs ? 'Si internet se desconecta, use el botón "Reiniciar" en la interfaz WAN para restablecer la conexión con el operador. Para cambiar el rango de IP, edite la interfaz LAN.' :
                         'Se a internet cair, use o botão "Reiniciar" na interface WAN para restabelecer a conexão com a operadora. Para mudar a faixa de IP dos seus aparelhos, edite a interface LAN.'),
          rec:   isEn ? 'Keep the router at IP 192.168.12.1 to avoid conflicts with ISP modems (which often use 192.168.1.1 or 192.168.0.1).' :
                 (isEs ? 'Mantenga el router en la IP 192.168.12.1 para evitar conflictos con módems de operadoras (que suelen usar 192.168.1.1 o 192.168.0.1).' :
                         'Mantenha o roteador no IP 192.168.12.1 para nunca conflitar com modems de operadoras (que costumam usar 192.168.1.1 ou 192.168.0.1).')
        };
      } else if (path.indexOf('/system/flash') !== -1) {
        guide = {
          title: isEn ? 'Backup, Restore & Firmware Guide' :
                 (isEs ? 'Guía de Copia de Seguridad, Restauración y Firmware' :
                         'Guia de Backup, Restauração e Firmware'),
          serve: isEn ? 'System security center to create backup copies of all network and Wi-Fi settings, restore previous backups, or upgrade the OpenWrt operating system.' :
                 (isEs ? 'Centro de seguridad del sistema para crear copias de seguridad de todos los ajustes de red y Wi-Fi, restaurar respaldos o actualizar el sistema OpenWrt.' :
                         'Central de segurança do sistema para criar cópias de backup de todos os ajustes de rede e Wi-Fi, restaurar backups anteriores ou atualizar o sistema operacional OpenWrt.'),
          fazer: isEn ? 'Generate a backup archive before making any technical changes. To return to clean factory defaults, use the "Factory Reset" button.' :
                 (isEs ? 'Genere una copia de seguridad antes de realizar cambios técnicos. Para volver al estado original de fábrica, use el botón "Restaurar de Fábrica".' :
                         'Gere um arquivo de backup antes de fazer qualquer alteração técnica. Para voltar ao estado original de fábrica, use o botão "Restaurar de Fábrica".'),
          rec:   isEn ? 'Always download a backup (.tar.gz) to your computer before installing firmware upgrades. Never unplug the router from power during firmware flashing.' :
                 (isEs ? 'Descargue siempre una copia de seguridad (.tar.gz) en su ordenador antes de instalar actualizaciones. Nunca desenchufe el equipo durante el flasheo de firmware.' :
                         'Sempre baixe um backup (.tar.gz) para o seu computador antes de instalar atualizações. Nunca desligue o aparelho da tomada durante uma gravação de firmware.')
        };
      } else if (path.indexOf('/network/diagnostics') !== -1) {
        guide = {
          title: isEn ? 'Network Diagnostics Guide' :
                 (isEs ? 'Guía de Diagnósticos de Red' :
                         'Guia de Diagnósticos de Rede'),
          serve: isEn ? 'Tests internet health by measuring latency (ping), tracing the route to target servers (traceroute), and verifying domain name resolution (DNS).' :
                 (isEs ? 'Comprueba el estado de su conexión midiendo latencia (ping), trazando la ruta al destino (traceroute) y probando resolución de nombres (DNS).' :
                         'Testa a saúde da sua internet medindo latência (ping), rastreando a rota até o servidor de destino (traceroute) e testando a resolução de nomes (DNS).'),
          fazer: isEn ? 'Click the quick action buttons (Google DNS or Cloudflare) to test your connection in 1 click without typing terminal commands.' :
                 (isEs ? 'Haga clic en los botones rápidos (Google DNS o Cloudflare) para probar su conexión con 1 clic sin escribir comandos.' :
                         'Clique nos botões rápidos (Google DNS ou Cloudflare) para testar sua conexão com 1 clique sem precisar digitar comandos.'),
          rec:   isEn ? 'Latency below 30 ms is optimal for voice calls and online gaming. If ping responds but websites do not load, your DNS servers are down.' :
                 (isEs ? 'Una latencia inferior a 30 ms es ideal para llamadas de voz y juegos en línea. Si el ping responde pero las páginas no abren, sus servidores DNS están caídos.' :
                         'Latência abaixo de 30 ms é ideal para chamadas de voz e jogos online. Se o Ping responder mas os sites não abrirem, seus servidores DNS estão fora do ar.')
        };
      } else if (path.indexOf('/system/reboot') !== -1) {
        guide = {
          title: isEn ? 'Safe Reboot Guide' :
                 (isEs ? 'Guía de Reinicio Seguro' :
                         'Guia de Reinicialização Segura'),
          serve: isEn ? 'Reboots the router operating system safely, terminating lingering processes and clearing RAM without loss of configurations.' :
                 (isEs ? 'Reinicia el sistema operativo del router de forma segura, cerrando procesos zombis y liberando memoria RAM sin perder configuraciones.' :
                         'Reinicia o sistema operacional do roteador de forma segura, descarregando processos zumbis e liberando memória RAM sem perda de configurações.'),
          fazer: isEn ? 'Use this option if the internet feels sluggish after weeks of continuous uptime. The process takes approximately 60 to 75 seconds.' :
                 (isEs ? 'Use esta opción si internet se nota lenta tras semanas de uso continuo. El proceso tarda aproximadamente entre 60 y 75 segundos.' :
                         'Use esta opção se a internet estiver lenta após semanas ligada direto. O processo leva cerca de 60 a 75 segundos.'),
          rec:   isEn ? 'Avoid pulling the power plug directly to prevent corruption of the router SPI/NAND flash storage.' :
                 (isEs ? 'Evite desenchufar el cable de corriente directamente para evitar corromper la memoria flash del router.' :
                         'Evite desligar puxando o cabo de energia da tomada para não corromper a memória flash SPI do equipamento.')
        };
      } else if (path.indexOf('/network/firewall') !== -1) {
        guide = {
          title: isEn ? 'Firewall & Port Rules Guide' :
                 (isEs ? 'Guía de Cortafuegos y Puertos' :
                         'Guia do Firewall e Portas'),
          serve: isEn ? 'Protective barrier that blocks unauthorized incoming internet connections to your local computers and mobile devices.' :
                 (isEs ? 'Barrera de protección que bloquea conexiones no autorizadas procedentes de internet hacia sus ordenadores y móviles.' :
                         'Barreira de proteção que bloqueia conexões não autorizadas vindas da internet para seus computadores e celulares.'),
          fazer: isEn ? 'If you need to host a local server or achieve Open NAT in games, configure Port Forwarding rules strictly for the required IPs.' :
                 (isEs ? 'Si necesita alojar un servidor local u obtener NAT Abierta en juegos, configure reglas de redirección de puertos solo para las IPs necesarias.' :
                         'Se precisar hospedar um servidor local ou obter NAT Aberto em jogos, crie regras de redirecionamento de portas (Port Forwarding) apenas para os IPs necessários.'),
          rec:   isEn ? 'Keep WAN input policy set to "Drop" / "Reject" to keep your home network invisible to external internet port scans.' :
                 (isEs ? 'Mantenga la política de entrada de la WAN en "Rechazar" (Drop) para mantener su red doméstica invisible a escaneos externos.' :
                         'Mantenha a política de entrada da WAN como "Rejeitar" (Drop) para manter a rede doméstica invisível a invasores externos.')
        };
      } else if (path.indexOf('/network/dhcp') !== -1) {
        guide = {
          title: isEn ? 'DHCP Server & DNS Guide' :
                 (isEs ? 'Guía de Servidor DHCP y DNS' :
                         'Guia de Servidor DHCP e DNS'),
          serve: isEn ? 'DHCP automatically assigns IP addresses to devices connecting via Wi-Fi or Ethernet. DNS converts human website names into IP addresses.' :
                 (isEs ? 'El DHCP asigna automáticamente direcciones IP a cada nuevo dispositivo por Wi-Fi o cable. El DNS convierte nombres de sitios en números IP.' :
                         'O DHCP atribui automaticamente endereços IP para cada novo dispositivo que entra no Wi-Fi ou cabo. O DNS converte nomes de sites em números IP de acesso.'),
          fazer: isEn ? 'To assign fixed IPs to printers, NAS, or cameras, scroll to "Static Leases" and bind the desired IP to the device MAC address.' :
                 (isEs ? 'Para fijar la IP de impresoras o cámaras IP, desplácese a "Leases Estáticos" y vincule la IP deseada a la MAC del dispositivo.' :
                         'Para fixar o IP de impressoras ou câmeras IP, role até "Leases Estáticos" e vincule o IP desejado ao endereço MAC do aparelho.'),
          rec:   isEn ? 'Use a 12-hour lease time and configure fast DNS upstream servers like 1.1.1.1 (Cloudflare) or 8.8.8.8 (Google).' :
                 (isEs ? 'Utilice un tiempo de concesión de 12 horas y configure servidores DNS rápidos como 1.1.1.1 (Cloudflare) o 8.8.8.8 (Google).' :
                         'Utilize tempo de concessão de 12 horas e configure servidores DNS rápidos como 1.1.1.1 (Cloudflare) ou 8.8.8.8 (Google).')
        };
      } else if (path.indexOf('/network/mwan') !== -1) {
        guide = {
          title: isEn ? 'MWAN3 Guide (Multi-WAN Load Balancing & Failover)' :
                 (isEs ? 'Guía de MWAN3 (Balanceo de Carga y Conmutación por Error)' :
                         'Guia do MWAN3 (Balanceamento e Redundância de Internet)'),
          serve: isEn ? 'Monitors multiple internet connections, detects link drops automatically to switch routes or aggregate bandwidth across multiple ISPs.' :
                 (isEs ? 'Monitoriza múltiples conexiones a internet y detecta caídas para conmutar rutas o sumar enlaces de distintos proveedores.' :
                         'Monitora links de internet (Multi-WAN) e detecta quedas automaticamente para alternar rotas ou somar conexões de operadoras diferentes.'),
          fazer: isEn ? 'The "Ping Interval" (e.g. 5 seconds) is the frequency used to check link vitality. If 3 consecutive tests fail, the route is declared down. Click "Edit" to adjust.' :
                 (isEs ? 'El "Intervalo de Ping" (ej: 5 segundos) es la frecuencia con que comprueba si la conexión está viva. Si falla 3 veces, la ruta se declara inactiva. Pulse "Editar" para cambiarlo.' :
                         'O "Intervalo de Ping" (ex: 5 segundos) é a frequência com que o roteador testa se a internet está viva. Se o teste falhar 3 vezes seguidas, a rota é declarada inoperante. Clique no botão "Editar" de cada interface para alterar os segundos do intervalo ou os IPs de teste.'),
          rec:   isEn ? 'If using only a single ISP cable (Single WAN), MWAN3 operates in standard mode and yellow warnings at the top are normal and harmless.' :
                 (isEs ? 'Si utiliza solo 1 conexión de proveedor (WAN única), MWAN3 opera en modo estándar y las advertencias amarillas superiores son normales e inofensivas.' :
                         'Se você utiliza apenas 1 cabo de operadora (WAN única), o MWAN3 opera em modo padrão e os avisos amarelos no topo (wan6/wanb não encontrada) são normais e inofensivos.')
        };
      } else if (path.indexOf('/status/overview') !== -1) {
        guide = {
          title: isEn ? 'System Overview Guide' :
                 (isEs ? 'Guía de Visión General del Sistema' :
                         'Guia da Visão Geral do Sistema'),
          serve: isEn ? 'Telemetry dashboard displaying router health, CPU load, RAM usage, and active connected devices.' :
                 (isEs ? 'Panel de telemetría que muestra el estado del router, uso de CPU, memoria RAM y dispositivos conectados.' :
                         'Painel de telemetria mostrando o estado de funcionamento do roteador, uso de processamento, memória RAM e dispositivos conectados.'),
          fazer: isEn ? 'Monitor CPU and RAM gauges. If free RAM stays continuously below 40 MB, perform a scheduled maintenance reboot.' :
                 (isEs ? 'Supervise los indicadores de CPU y RAM. Si la RAM libre permanece por debajo de 40 MB de forma continua, reinicie para mantenimiento.' :
                         'Monitore os medidores de CPU e RAM no topo. Se a RAM livre ficar abaixo de 40 MB de forma contínua, faça uma reinicialização de manutenção.'),
          rec:   isEn ? 'Maintain a safe free RAM margin to guarantee stability and maximum packet routing throughput.' :
                 (isEs ? 'Mantenga un margen seguro de RAM libre para garantizar estabilidad y máxima fluidez de tráfico.' :
                         'Mantenha margem segura de RAM livre para garantir estabilidade e máxima fluidez de tráfego.')
        };
      } else if (path.indexOf('/system/system') !== -1) {
        guide = {
          title: isEn ? 'General Settings & Clock Sync Guide' :
                 (isEs ? 'Guía de Configuración General y Sincronización Horaria' :
                         'Guia de Configurações Gerais e Sincronização de Horário'),
          serve: isEn ? 'Sets the router hostname on the network and automatically synchronizes the system clock with official NTP servers.' :
                 (isEs ? 'Define el nombre del router (hostname) en la red y sincroniza automáticamente la hora con servidores NTP de internet.' :
                         'Define o nome identificador do roteador (hostname) na rede e sincroniza automaticamente o relógio com servidores NTP oficiais da internet.'),
          fazer: isEn ? 'Keep NTP time synchronization enabled so system logs, firewall schedules, and traffic history timestamps are accurate.' :
                 (isEs ? 'Mantenga activa la sincronización NTP para que los registros de log, horarios del cortafuegos y tráfico tengan marcas precisas.' :
                         'Mantenha a sincronização NTP ativa para que os registros de log, agendamentos do firewall e relatórios de tráfego tenham horários precisos.'),
          rec:   isEn ? 'Configure reliable NTP pool servers and your local timezone for precise logging.' :
                 (isEs ? 'Configure servidores del grupo NTP y su zona horaria local para registros precisos.' :
                         'Utilize o servidor pool.ntp.br e o fuso horário America/Sao_Paulo (UTC-3) para precisão no Brasil.')
        };
      } else if (path.indexOf('/status/processes') !== -1) {
        guide = {
          title: isEn ? 'Running Processes Guide (RAM Memory)' :
                 (isEs ? 'Guía de Procesos en Ejecución (Memoria RAM)' :
                         'Guia de Processos em Execução (Memória RAM)'),
          serve: isEn ? 'Real-time list of active processes running in router RAM (ps command). All items listed are already active.' :
                 (isEs ? 'Lista en tiempo real de procesos activos en la RAM del router (comando ps). Todos los elementos ya están en ejecución.' :
                         'Lista em tempo real os processos ativos na memória RAM do roteador (comando ps). Todos os itens listados já estão em execução, por isso não há opção de "Iniciar" direto nesta tabela.'),
          fazer: isEn ? 'Monitor CPU and memory consumption. Click column headers to sort. Use "🔄 Reload" (SIGHUP) to apply changes without dropping from memory, "Terminate" (SIGTERM) or "Kill" (SIGKILL) if frozen.' :
                 (isEs ? 'Supervise consumo de CPU y memoria. Pulse encabezados para ordenar. Use "🔄 Recargar" (SIGHUP), "Terminar" (SIGTERM) o "Matar" (SIGKILL) si se bloquea.' :
                         'Monitore o consumo de CPU e memória. Clique nos títulos das colunas (CPU, Memória, Comando ou PID) para ordenar a lista instantaneamente. Use "🔄 Recarregar" (SIGHUP) para recarregar configurações sem reiniciar nem descarregar da memória, "Terminar" (SIGTERM) para encerrar suavemente ou "Matar" (SIGKILL) caso o processo trave. Para INICIAR ou PARAR serviços do sistema, utilize o atalho no topo para "Sistema -> Inicialização".'),
          rec:   isEn ? 'Never terminate essential system daemons (such as procd, ubusd, netifd, or uhttpd).' :
                 (isEs ? 'Nunca finalice procesos esenciales del sistema operativo (como procd, ubusd, netifd o uhttpd).' :
                         'Nunca finalize processos essenciais do sistema operacional (como procd, ubusd, netifd ou uhttpd), pois eles mantêm o roteador e este painel funcionando.')
        };
      } else if (path.indexOf('/network/switch') !== -1 || path.indexOf('/network/vlan') !== -1) {
        guide = {
          title: isEn ? 'Switch & VLANs Guide (Physical Network Ports)' :
                 (isEs ? 'Guía de Switch y VLANs (Puertos de Red Físicos)' :
                         'Guia de Switch e VLANs (Portas de Rede Físicas)'),
          serve: isEn ? 'Configures the internal hardware switch, dividing physical rear ports into isolated logical networks (VLANs).' :
                 (isEs ? 'Configura el conmutador de hardware interno, dividiendo los puertos físicos en redes lógicas aisladas (VLANs).' :
                         'Configura o comutador de hardware interno (Switch Gigabit) dividindo as portas físicas traseiras em redes lógicas isoladas (VLANs).'),
          fazer: isEn ? 'Keep ports 1-4 untagged (U) on VLAN 1 for the local network (LAN). WAN port connects on VLAN 2.' :
                 (isEs ? 'Mantenga los puertos 1 a 4 como "untagged" (U) en la VLAN 1 para la LAN local. El puerto WAN se conecta en VLAN 2.' :
                         'Mantenha as portas 1 a 4 marcadas como "untagged" (U) na VLAN 1 para a rede local (LAN). A porta WAN conecta-se na VLAN 2.'),
          rec:   isEn ? 'NEVER uncheck or modify CPU port (eth0); it is the vital pipeline between CPU and switch ports.' :
                 (isEs ? 'NUNCA desmarque ni modifique el puerto de CPU (eth0), es el enlace vital entre procesador y puertos del router.' :
                         'NUNCA desmarque nem altere a porta de CPU (eth0), pois ela é a ponte vital de comunicação entre o processador e as portas do roteador. Se quiser criar uma rede de visitantes isolada, utilize a interface Wi-Fi Guest em vez de alterar as VLANs físicas.')
        };
      } else if (path.indexOf('/nlbw/display') !== -1) {
        guide = {
          title: isEn ? 'Bandwidth Monitor Guide (Netlink / nlbwmon)' :
                 (isEs ? 'Guía del Monitor de Ancho de Banda (Netlink / nlbwmon)' :
                         'Guia do Monitor de Largura de Banda (Netlink)'),
          serve: isEn ? 'Monitors and logs real-time data consumption per client device in interactive charts across customizable timeframes.' :
                 (isEs ? 'Monitoriza y registra en gráficos interactivos el consumo de datos de cada dispositivo en tiempo real.' :
                         'Monitora e registra em gráficos interativos o consumo de dados de cada computador, videogame e celular da sua casa em tempo real e por períodos acumulados.'),
          fazer: isEn ? 'Use the donut chart and client table below to discover which devices or protocols consume the most bandwidth.' :
                 (isEs ? 'Use el gráfico de anillo y la tabla de clientes para descubrir qué dispositivos consumen más ancho de banda.' :
                         'Use o gráfico de rosca (donut) e a tabela de clientes abaixo para descobrir quais aparelhos ou protocolos estão usando a maior parte da sua franquia de dados ou banda de internet.'),
          rec:   isEn ? 'If internet slows down during heavy downloads, activate Smart Queue Management (SQM CAKE) in ARK Router.' :
                 (isEs ? 'Si internet se vuelve lento durante descargas intensas, active Smart Queue Management (SQM CAKE) en ARK Router.' :
                         'Se sua internet estiver lenta durante downloads pesados de algum aparelho, utilize o Smart Queue Management (SQM Cake) no ARK Router para priorizar chamadas de voz e jogos.')
        };
      } else if (path.indexOf('/system/leds') !== -1) {
        guide = {
          title: isEn ? 'Status LEDs & Illumination Guide' :
                 (isEs ? 'Guía de Iluminación y LEDs de Estado' :
                         'Guia de Iluminação e LEDs de Status'),
          serve: isEn ? 'Controls front chassis LEDs (Power, Internet, Wi-Fi 2.4/5 GHz) to indicate network health, outages, or physical activity.' :
                 (isEs ? 'Controla los LEDs frontales del router (Power, Internet, Wi-Fi 2.4/5 GHz) para indicar estado de red o caídas.' :
                         'Controla os LEDs luminosos frontais do roteador (Status/Power, Internet, Wi-Fi 2.4 GHz e Wi-Fi 5 GHz) para indicar status de rede, quedas ou atividade física do seu aparelho.'),
          fazer: isEn ? 'Select a quick profile at the top (Smart Internet, Night Mode, Outage Alert) to adjust all LEDs in 1 click.' :
                 (isEs ? 'Elija un perfil rápido arriba (Internet Inteligente, Modo Nocturno, Alerta de Caída) con 1 clic.' :
                         'Escolha um dos perfis rápidos no topo (Internet Inteligente, Modo Noturno, Alerta de Queda) para ajustar automaticamente todos os LEDs com 1 clique.'),
          rec:   isEn ? 'In bedrooms, enable "Night Mode" to turn off lights completely for a dark, glare-free environment.' :
                 (isEs ? 'En dormitorios, active el "Modo Nocturno" para apagar las luces y asegurar un entorno 100% oscuro.' :
                         'Em dormitórios, ative o "Modo Noturno" para desligar as luzes e garantir um ambiente 100% escuro sem claridade.')
        };
      } else if (path.indexOf('/services/uhttpd') !== -1) {
        guide = {
          title: isEn ? 'uHTTPd Web Server Guide' :
                 (isEs ? 'Guía del Servidor Web uHTTPd' :
                         'Guia do Servidor Web uHTTPd'),
          serve: isEn ? 'uHTTPd is the internal HTTP/HTTPS web server powering the LuCI dashboard and browser administration.' :
                 (isEs ? 'uHTTPd es el servidor web HTTP y HTTPS interno responsable de mostrar este panel LuCI.' :
                         'O uHTTPd é o servidor web HTTP e HTTPS interno do roteador, responsável por exibir este painel de controle LuCI e permitir a administração pelo navegador.'),
          fazer: isEn ? 'Adjust listening ports (default 80 and 443) or SSL parameters. NEVER delete the "main" instance.' :
                 (isEs ? 'Ajuste puertos de escucha (80 y 443) o parámetros SSL. NUNCA elimine la instancia "main".' :
                         'Ajuste portas de escuta (padrão 80 e 443) ou parâmetros de certificados. NUNCA apague a instância principal "main", pois ela mantém esta interface gráfica ativa.'),
          rec:   isEn ? 'Keep "Ignore private IP addresses on public interface" checked (RFC1918) for perimeter security.' :
                 (isEs ? 'Mantenga marcada la protección RFC1918 para proteger el acceso administrativo contra amenazas externas.' :
                         'Mantenha "Ignore endereços IP privados na interface pública" marcado (RFC1918) para proteger o acesso administrativo contra ameaças externas da internet.')
        };
      } else if (path.indexOf('/status/syslog') !== -1 || path.indexOf('/status/dmesg') !== -1) {
        guide = {
          title: isEn ? 'System Event Logs Guide' :
                 (isEs ? 'Guía de Registros de Eventos del Sistema (Logs)' :
                         'Guia de Registros de Eventos do Sistema (Logs)'),
          serve: isEn ? 'Logs all operating events in real time, such as Wi-Fi client handshakes, DHCP renewals, and security alerts.' :
                 (isEs ? 'Registra en tiempo real los eventos operativos del router, como conexiones Wi-Fi o renovaciones de IP.' :
                         'Registra em tempo real todos os acontecimentos operacionais do roteador, como conexões de aparelhos Wi-Fi, renovação de IP na operadora e avisos de segurança.'),
          fazer: isEn ? 'Use the search box at the top to filter terms like wifi, pppoe, or error to troubleshoot quickly.' :
                 (isEs ? 'Use el buscador arriba para filtrar términos como wifi, pppoe o error para diagnosticar incidencias.' :
                         'Utilize o campo de busca no topo para pesquisar termos como wifi, pppoe ou error e diagnosticar problemas rapidamente.'),
          rec:   isEn ? 'During ISP outages, copy recent log lines mentioning wan or daemon to share with technical support.' :
                 (isEs ? 'En caso de caídas de conexión, copie las líneas recientes con wan o daemon para soporte técnico.' :
                         'Em caso de instabilidade com sua operadora, copie as linhas recentes que mencionem wan ou daemon para compartilhar com o suporte técnico.')
        };
      } else if (path.indexOf('/system/startup') !== -1) {
        guide = {
          title: isEn ? 'Startup & Services Guide' :
                 (isEs ? 'Guía de Inicio y Servicios' :
                         'Guia de Inicialização e Serviços'),
          serve: isEn ? 'Controls system services loaded automatically when the router boots up.' :
                 (isEs ? 'Controla qué servicios del sistema se cargan automáticamente al arrancar el router.' :
                         'Controla quais serviços do sistema são carregados automaticamente quando o roteador é ligado na tomada.'),
          fazer: isEn ? 'Start, restart, or stop individual daemons without rebooting the entire hardware unit.' :
                 (isEs ? 'Inicie, reinicie o detenga servicios individuales sin reiniciar todo el dispositivo.' :
                         'Você pode iniciar, reiniciar ou parar serviços individuais caso precise reiniciar uma função específica da rede sem reiniciar o aparelho inteiro.'),
          rec:   isEn ? 'Enable only necessary services to maximize available free RAM memory.' :
                 (isEs ? 'Mantenga habilitados solo los servicios indispensables para maximizar la memoria RAM libre.' :
                         'Mantenha habilitados apenas os serviços necessários para maximizar a memória RAM livre do equipamento.')
        };
      } else if (path.indexOf('/status/iptables') !== -1) {
        guide = {
          title: isEn ? 'Firewall Packet Flow Guide (iptables / nftables)' :
                 (isEs ? 'Guía de Flujo del Cortafuegos (iptables / nftables)' :
                         'Guia de Condição e Fluxo do Firewall (iptables)'),
          serve: isEn ? 'Real-time Netfilter packet telemetry displaying accepted, dropped, or redirected packets between LAN and WAN.' :
                 (isEs ? 'Telemetría de paquetes Netfilter en tiempo real con tráfico aceptado, bloqueado o redirigido.' :
                         'Painel de telemetria em tempo real do Kernel Linux Netfilter. Mostra o fluxo exato de pacotes e bytes aceitos, bloqueados ou redirecionados entre sua rede local e a internet.'),
          fazer: isEn ? 'Empty chains are hidden by default. Use search bar to find rules by IP or port.' :
                 (isEs ? 'Las cadenas vacías se ocultan por defecto. Use la búsqueda para filtrar reglas por IP o puerto.' :
                         'As correntes vazias vêm ocultadas por padrão para facilitar a leitura. Use a barra de busca no topo para pesquisar regras por IP, porta ou protocolo. Para adicionar ou modificar regras de segurança, clique no botão "⚙️ Editar Regras de Firewall (Rede ➔ Firewall)".'),
          rec:   isEn ? 'The FORWARD chain must always maintain a default policy of DROP (Block incoming).' :
                 (isEs ? 'La cadena FORWARD debe mantener siempre la política en DROP (Bloquear conexiones entrantes).' :
                         'A corrente FORWARD deve sempre manter a política padrão em DROP (Bloquear), garantindo que conexões externas não autorizadas nunca alcancem seus computadores e celulares.')
        };
      } else if (path.indexOf('/services/upnp') !== -1) {
        guide = {
          title: isEn ? 'UPnP & NAT-PMP Guide (Automatic Port Forwarding)' :
                 (isEs ? 'Guía de UPnP y NAT-PMP (Apertura Automática de Puertos)' :
                         'Guia de UPnP e NAT-PMP (Abertura Automática de Portas)'),
          serve: isEn ? 'Allows gaming consoles (PlayStation, Xbox, Switch) and PC apps to automatically open temporary ports for Open NAT.' :
                 (isEs ? 'Permite a consolas (PlayStation, Xbox, Switch) y aplicaciones abrir puertos temporales para NAT Abierta.' :
                         'Permite que consoles (PlayStation, Xbox, Switch) e aplicativos (torrents, games de PC) abram automaticamente portas de comunicação temporárias no roteador para obter NAT Aberto.'),
          fazer: isEn ? 'If you play online games, keep UPnP active for fast matchmaking and voice chat without strict NAT hurdles.' :
                 (isEs ? 'Si juega en línea, mantenga UPnP activo para emparejamiento rápido y chat de voz sin restricciones.' :
                         'Se você joga online no videogame ou PC, mantenha o UPnP ativado para garantir conexões rápidas e bate-papo por voz sem bloqueios. Caso prefira segurança total e controle manual, desmarque e crie regras manuais no Firewall.'),
          rec:   isEn ? 'Keep UPnP active in gaming households. ARK Router automatically cleans stale port leases.' :
                 (isEs ? 'Mantenga UPnP activo en hogares con jugadores. ARK Router limpia automáticamente concesiones inactivas.' :
                         'Mantenha "Dispare os serviços de UPnP e NAT-PMP" ativado em residências com gamers. O ARK Router gerencia a limpeza automática das concessões inativas.')
        };
      } else if (path.indexOf('/status/realtime') !== -1) {
        guide = {
          title: isEn ? 'Real-Time Graphs Guide (Bandwidth & Load)' :
                 (isEs ? 'Guía de Gráficos en Tiempo Real (Ancho de Banda y Carga)' :
                         'Guia de Gráficos em Tempo Real (Largura de Banda e Carga)'),
          serve: isEn ? 'Dynamically updating telemetry panel displaying CPU load, download/upload rates, Wi-Fi noise, and active connections.' :
                 (isEs ? 'Panel dinámico que muestra carga de CPU, tasas de descarga/subida, ruido Wi-Fi y sesiones activas.' :
                         'Painel com atualização dinâmica a cada 3 segundos exibindo carga da CPU, velocidade de download/upload, ruído do sinal Wi-Fi e sessões ativas (TCP/UDP).'),
          fazer: isEn ? 'Switch tabs to diagnose latency spikes. If traffic saturates your connection, enable Smart Queue Management (SQM CAKE).' :
                 (isEs ? 'Cambie pestañas para diagnosticar picos de consumo. Si el tráfico satura el enlace, active SQM CAKE.' :
                         'Alterne entre as abas superiores para diagnosticar picos de consumo ou lentidão na rede. Se o tráfego atingir 100% da sua conexão, ative o Smart Queue Management (SQM Cake) no ARK Router para evitar lag em jogos.'),
          rec:   isEn ? 'For fluid gaming, UDP jitter must remain stable and CPU load should not exceed 1.50.' :
                 (isEs ? 'Para juegos fluidos, las conexiones UDP deben ser estables y la carga de CPU no debe superar 1.50.' :
                         'Para menor latência e jogos online fluidos, conexões UDP devem se manter estáveis e a Carga da CPU não deve ultrapassar 1.50.')
        };
      }"""

# Find start and end indices
start_idx = text.find("      } else if (path.indexOf('/network/network') !== -1) {")
end_idx = text.find("      if (!existingGuide) {", start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find exact block!")
    exit(1)

# Find the end of the realtime block before "if (!existingGuide)"
# The last guide ends right before "if (!existingGuide)"
new_text = text[:start_idx] + replacement + "\n\n" + text[end_idx:]

with open(theme_path, "w", encoding="utf-8") as f:
    f.write(new_text)

print("[OK] ark-theme.js updated with 100% tri-lingual guide banners!")
