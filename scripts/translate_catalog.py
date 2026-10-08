#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated Batch Technical Translator for ARK Router
Injects missing technical UI strings into po/en/ark.po and po/es/ark.po
preserving telecommunications terms (WAN, LAN, VLAN, SSID, MTU, PPPoE, CAKE, SQM, etc.)
"""

import os
import re
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

EN_PO = os.path.join(REPO_DIR, "po", "en", "ark.po")
ES_PO = os.path.join(REPO_DIR, "po", "es", "ark.po")

# Load existing PO keys to avoid duplicate msgids
def get_existing_keys(path):
    if not os.path.isfile(path):
        return set()
    with open(path, "r", encoding="utf-8") as f:
        return set(re.findall(r'msgid "([^"]+)"', f.read()))

# High-priority technical UI translations dictionary
TECH_TRANSLATIONS = {
    # --- Performance, Offloading & Network Optimizations ---
    "🧠 Buffers Estendidos de Memória (TCP Turbo)": {
        "en": "🧠 Extended Memory Buffers (TCP Turbo)",
        "es": "🧠 Búferes Extendidos de Memoria (TCP Turbo)"
    },
    "🧠 Proteção de Memória RAM (128 MB)": {
        "en": "🧠 RAM Memory Protection (128 MB)",
        "es": "🧠 Protección de Memoria RAM (128 MB)"
    },
    "Aumenta os buffers de rede para 8 MB, mantendo velocidade máxima contínua em downloads pesados.": {
        "en": "Increases network buffers to 8 MB, sustaining continuous maximum speed during heavy downloads.",
        "es": "Aumenta los búferes de red a 8 MB, manteniendo velocidad máxima continua en descargas pesadas."
    },
    "Mantém o uso de memória enxuto no roteador para evitar travamentos ou lentidão durante múltiplos downloads pesados (torrents, Steam, streams 4K).": {
        "en": "Keeps memory footprint lean to prevent crashes or slowdowns during multiple concurrent heavy downloads (torrents, Steam, 4K streams).",
        "es": "Mantiene el uso de memoria reducido para evitar bloqueos o lentitud durante múltiples descargas pesadas concurrentes (torrents, Steam, streams 4K)."
    },
    "Recomendado para conexões de alta velocidade em roteadores com 256 MB ou mais de RAM.": {
        "en": "Recommended for high-speed connections on routers with 256 MB or more of RAM.",
        "es": "Recomendado para conexiones de alta velocidad en routers con 256 MB o más de RAM."
    },
    "🚀 Aceleração de Tráfego (Fastpath / Flow Offloading)": {
        "en": "🚀 Traffic Acceleration (Fastpath / Flow Offloading)",
        "es": "🚀 Aceleración de Tráfico (Fastpath / Flow Offloading)"
    },
    "Processa o tráfego de dados diretamente pelo kernel do Linux, reduzindo o uso da CPU para a internet rodar na velocidade máxima sem aquecer o roteador.": {
        "en": "Processes packet forwarding directly inside the Linux kernel, minimizing CPU load so internet runs at line speed without overheating the router.",
        "es": "Procesa el tráfico de datos directamente a través del kernel de Linux, minimizando la carga de CPU para operar a máxima velocidad sin sobrecalentar el router."
    },
    "🛡️ Desativado: SQM / CAKE ativo. Fastpath desabilitado para não desviar pacotes da fila anti-bufferbloat.": {
        "en": "🛡️ Disabled: SQM / CAKE is active. Fastpath is disabled to avoid bypassing the anti-bufferbloat queue.",
        "es": "🛡️ Desactivado: SQM / CAKE activo. Fastpath deshabilitado para no desviar paquetes de la cola anti-bufferbloat."
    },
    "⚙️ IRQ Balance": {
        "en": "⚙️ IRQ Balance",
        "es": "⚙️ IRQ Balance"
    },
    "Distribui o processamento de rede entre os núcleos de CPU disponíveis.": {
        "en": "Distributes network interrupt processing across all available CPU cores.",
        "es": "Distribuye el procesamiento de interrupciones de red entre todos los núcleos de CPU disponibles."
    },
    "Processamento multicore distribuído nativamente por hardware/driver (DMA rings).": {
        "en": "Multicore packet processing distributed natively by hardware/driver (DMA rings).",
        "es": "Procesamiento multinúcleo distribuido nativamente por hardware/driver (anillos DMA)."
    },
    "Módulo não instalado neste roteador.": {
        "en": "Module not installed on this router.",
        "es": "Módulo no instalado en este router."
    },
    "📶 Otimização Multicast / Wi-Fi (IGMP Snooping)": {
        "en": "📶 Multicast / Wi-Fi Optimization (IGMP Snooping)",
        "es": "📶 Optimización Multicast / Wi-Fi (IGMP Snooping)"
    },
    "Evita que transmissões multicast (IPTV, Chromecast, Apple AirPlay, streaming local e mDNS) sejam propagadas como broadcast para todas as antenas Wi-Fi. Direciona os dados exclusivamente para o dispositivo que solicitou a transmissão, economizando tempo de antena (airtime) e mantendo a taxa máxima do Wi-Fi 7.": {
        "en": "Prevents multicast streams (IPTV, Chromecast, Apple AirPlay, local streaming, and mDNS) from flooding all Wi-Fi antennas as broadcast. Directs packets exclusively to the requesting client, saving wireless airtime and sustaining maximum Wi-Fi 7 throughput.",
        "es": "Evita que transmisiones multicast (IPTV, Chromecast, Apple AirPlay y mDNS) inunden todas las antenas Wi-Fi como broadcast. Dirige los datos únicamente al cliente que los solicitó, ahorrando tiempo de aire y sosteniendo la tasa máxima de Wi-Fi 7."
    },
    "2. ACELERAÇÃO DE DESEMPENHO DO ROTEADOR": {
        "en": "2. ROUTER PERFORMANCE ACCELERATION",
        "es": "2. ACELERACIÓN DE RENDIMIENTO DEL ROUTER"
    },
    "GERAL": {
        "en": "GENERAL",
        "es": "GENERAL"
    },
    "NATIVO": {
        "en": "NATIVE",
        "es": "NATIVO"
    },

    # --- System, Firmware, Backup & Factory Reset ---
    "Central de segurança do sistema para criar cópias de backup de todos os ajustes de rede e Wi-Fi, restaurar backups anteriores ou atualizar o sistema operacional OpenWrt.": {
        "en": "System security center to create backup copies of all network and Wi-Fi settings, restore previous backups, or upgrade the OpenWrt operating system.",
        "es": "Centro de seguridad del sistema para crear copias de seguridad de todos los ajustes de red y Wi-Fi, restaurar respaldos o actualizar el sistema OpenWrt."
    },
    "Gere um arquivo de backup antes de fazer qualquer alteração técnica. Para voltar ao estado original de fábrica, use o botão \"Restaurar de Fábrica\".": {
        "en": "Generate a backup archive before making any technical changes. To return to clean factory defaults, use the \"Factory Reset\" button.",
        "es": "Genere una copia de seguridad antes de realizar cambios técnicos. Para volver al estado original de fábrica, use el botón \"Restaurar de Fábrica\"."
    },
    "Sempre baixe um backup (.tar.gz) para o seu computador antes de instalar atualizações. Nunca desligue o aparelho da tomada durante uma gravação de firmware.": {
        "en": "Always download a backup (.tar.gz) to your computer before installing firmware upgrades. Never unplug the router from power during firmware flashing.",
        "es": "Descargue siempre una copia de seguridad (.tar.gz) en su ordenador antes de instalar actualizaciones. Nunca desenchufe el equipo durante el flasheo de firmware."
    },
    "A instalação criará backup automático, substituirá com segurança os arquivos da versão e recarregará a interface web. Configurações de rede serão preservadas.": {
        "en": "Installation will create an automatic backup, safely replace version files, and reload the web interface. Network configurations will be preserved.",
        "es": "La instalación creará una copia de seguridad automática, reemplazará de forma segura los archivos de versión y recargará la interfaz web. Se preservarán las configuraciones de red."
    },
    "Alterar o IP principal muda o endereço de acesso do painel e pode desconectar dispositivos. O ARK cria um backup em /tmp antes de aplicar.": {
        "en": "Changing the primary IP alters the dashboard address and may disconnect clients. ARK creates a backup in /tmp before applying.",
        "es": "Cambiar la IP principal altera la dirección de acceso al panel y puede desconectar dispositivos. ARK crea una copia en /tmp antes de aplicar."
    },
    "Restaurar de Fábrica": {
        "en": "Factory Reset",
        "es": "Restaurar de Fábrica"
    },
    "Restaurar Backup": {
        "en": "Restore Backup",
        "es": "Restaurar Copia de Seguridad"
    },
    "Gerar Arquivo de Backup": {
        "en": "Generate Backup Archive",
        "es": "Generar Archivo de Respaldo"
    },
    "Criar Backup Agora": {
        "en": "Create Backup Now",
        "es": "Crear Respaldo Ahora"
    },
    "Baixar Backup (.tar.gz)": {
        "en": "Download Backup (.tar.gz)",
        "es": "Descargar Respaldo (.tar.gz)"
    },

    # --- Wi-Fi 7, Mesh & Roaming ---
    "A largura maior aumenta velocidade máxima, mas também aumenta interferência e pode reduzir alcance estável. Alterar reinicia o Wi‑Fi.": {
        "en": "Higher bandwidth increases maximum throughput, but also increases channel interference and may reduce range. Changing will restart Wi-Fi.",
        "es": "Un mayor ancho de banda aumenta la velocidad máxima, pero también incrementa las interferencias y puede reducir el alcance. Cambiarlo reiniciará el Wi-Fi."
    },
    "Ao salvar, o Wi‑Fi reiniciará e os aparelhos serão desconectados. Depois, será necessário conectar novamente usando a nova senha.": {
        "en": "Upon saving, Wi-Fi will restart and devices will disconnect. Reconnection using the new password will be required.",
        "es": "Al guardar, el Wi-Fi se reiniciará y los dispositivos se desconectarán. Luego será necesario reconectarse usando la nueva contraseña."
    },
    "Ao alterar o país, as duas bandas voltarão ao modo automático e o Wi‑Fi será reiniciado. Selecione somente o país onde o equipamento está fisicamente instalado.": {
        "en": "Changing regulatory domain resets both radio bands to automatic and restarts Wi-Fi. Select only the country where the device is physically located.",
        "es": "Al cambiar el país reglamentario, ambas bandas volverán al modo automático y se reiniciará el Wi-Fi. Seleccione solo el país donde el router está físicamente instalado."
    },
    "A chave Mesh precisa de pelo menos 8 caracteres.": {
        "en": "Mesh passphrase requires at least 8 characters.",
        "es": "La clave Mesh requiere al menos 8 caracteres."
    },
    "A chave Mesh precisa ter entre 8 e 63 caracteres.": {
        "en": "Mesh passphrase must be between 8 and 63 characters.",
        "es": "La clave Mesh debe tener entre 8 y 63 caracteres."
    },
    "Apenas 2.4 GHz": {
        "en": "2.4 GHz Only",
        "es": "Solo 2.4 GHz"
    },
    "Apenas 5 GHz": {
        "en": "5 GHz Only",
        "es": "Solo 5 GHz"
    },
    "Apenas 6 GHz (Wi-Fi 6E / Wi-Fi 7)": {
        "en": "6 GHz Only (Wi-Fi 6E / Wi-Fi 7)",
        "es": "Solo 6 GHz (Wi-Fi 6E / Wi-Fi 7)"
    },
    "Canais DFS — Espectro Limpo (Espera CAC de 60s)": {
        "en": "DFS Channels — Clean Spectrum (Requires 60s CAC Check)",
        "es": "Canales DFS — Espectro Limpio (Requiere espera CAC de 60s)"
    },
    "Assistente de Roaming e Band Steering (usteer)": {
        "en": "Roaming & Band Steering Assistant (usteer)",
        "es": "Asistente de Roaming y Band Steering (usteer)"
    },
    "Ativar Enlace Mesh (802.11s)": {
        "en": "Enable Mesh Link (802.11s)",
        "es": "Habilitar Enlace Mesh (802.11s)"
    },

    # --- Devices, MAC Leases & QoS ---
    "Aparelho com MAC aleatório/privado gerado pelo sistema (iOS/Android). Para fixar IP permanente, mude para MAC do dispositivo no aparelho.": {
        "en": "Device using randomized/private MAC generated by OS (iOS/Android). To set a permanent static lease, switch to device MAC on your phone/tablet.",
        "es": "Dispositivo con MAC aleatoria/privada generada por el sistema (iOS/Android). Para fijar una IP permanente, cambie a MAC de dispositivo en su terminal."
    },
    "Amarrar MAC ao IP": {
        "en": "Bind MAC to IP",
        "es": "Vincular MAC a IP"
    },
    "Fixar IP Permanente": {
        "en": "Set Static Lease",
        "es": "Fijar IP Permanente"
    },
    "Liberar IP": {
        "en": "Release IP",
        "es": "Liberar IP"
    },
    "Acesso local (LAN)": {
        "en": "Local Access (LAN)",
        "es": "Acceso Local (LAN)"
    },
    "Ajuste ao vivo (1 s)": {
        "en": "Live Adjustment (1 s)",
        "es": "Ajuste en Vivo (1 s)"
    },
    "Alta prioridade multimídia (AF31 / Fila de Vídeo). Recomendado para chamadas de vídeo (Zoom, Meet, Teams) e transmissões ao vivo.": {
        "en": "High multimedia priority (AF31 / Video Queue). Recommended for video conferences (Zoom, Meet, Teams) and live streams.",
        "es": "Alta prioridad multimedia (AF31 / Cola de Vídeo). Recomendado para videollamadas (Zoom, Meet, Teams) y transmisiones en vivo."
    },
    "Atenção: O Modo Gamer está ATIVO! Ao desligar o SQM / CAKE, a proteção anti-bufferbloat será desativada e o painel retornará automaticamente ao Modo Padrão.": {
        "en": "Notice: Gamer Mode is ACTIVE! Disabling SQM / CAKE removes anti-bufferbloat protection and the dashboard will automatically revert to Standard Mode.",
        "es": "Aviso: ¡El Modo Gamer está ACTIVO! Al desactivar SQM / CAKE, la protección anti-bufferbloat se desactivará y el panel volverá automáticamente al Modo Estándar."
    },

    # --- Adblock, DNS, Speedify & VPN ---
    "Anycast seguro com bloqueio automático contra malwares, phishing e ameaças.": {
        "en": "Secure Anycast with automatic blocking against malware, phishing, and online threats.",
        "es": "Anycast seguro con bloqueo automático contra malware, phishing y amenazas en línea."
    },
    "A agregação de links de internet (Speedify Bonding) atua nas portas WAN do Roteador Mestre (Gateway). Pontos de Acesso (APs) mantêm tráfego local transparente.": {
        "en": "Internet link bonding (Speedify Bonding) operates on Gateway WAN ports. Access Points (APs) maintain transparent local routing.",
        "es": "La agregación de enlaces (Speedify Bonding) opera en los puertos WAN del Router Maestro (Gateway). Los Puntos de Acceso (APs) mantienen el enrutamiento transparente."
    },
    "Abra o link abaixo em qualquer navegador, faça login na sua conta Speedify e conclua a ativação. O token fica salvo localmente no roteador.": {
        "en": "Open the link below in any browser, log into your Speedify account, and complete activation. The token is saved locally on the router.",
        "es": "Abra el enlace abajo en cualquier navegador, inicie sesión en su cuenta Speedify y complete la activación. El token se guarda localmente en el router."
    },
    "Abrir Fast.com": {
        "en": "Open Fast.com",
        "es": "Abrir Fast.com"
    },
    "Abrir Painel AdGuard ↗": {
        "en": "Open AdGuard Dashboard ↗",
        "es": "Abrir Panel AdGuard ↗"
    },
    "Abrir link": {
        "en": "Open Link",
        "es": "Abrir Enlace"
    },
    "Aplicar agora": {
        "en": "Apply Now",
        "es": "Aplicar Ahora"
    },
    "Aplicar canais": {
        "en": "Apply Channels",
        "es": "Aplicar Canales"
    },
    "Aplicar otimização": {
        "en": "Apply Optimization",
        "es": "Aplicar Optimización"
    },
    "Aplicar selecionados": {
        "en": "Apply Selected",
        "es": "Aplicar Seleccionados"
    },
    "Aplicar tema": {
        "en": "Apply Theme",
        "es": "Aplicar Tema"
    },
    "Ativar Modo": {
        "en": "Enable Mode",
        "es": "Habilitar Modo"
    },
    "Ativar Protocolo": {
        "en": "Enable Protocol",
        "es": "Habilitar Protocolo"
    },
    "Atualização em andamento…": {
        "en": "Update in progress…",
        "es": "Actualización en curso…"
    },
    "Conectar e Abrir Painel": {
        "en": "Connect & Open Dashboard",
        "es": "Conectar y Abrir Panel"
    },
    "Confirmar atualização": {
        "en": "Confirm Update",
        "es": "Confirmar Actualización"
    },
    "Confirmar e Instalar": {
        "en": "Confirm & Install",
        "es": "Confirmar e Instalar"
    },
    "Confirmar e aplicar": {
        "en": "Confirm & Apply",
        "es": "Confirmar y Aplicar"
    },
    "Confirmar país": {
        "en": "Confirm Country",
        "es": "Confirmar País"
    },
    "Continuar para Confirmação": {
        "en": "Proceed to Confirmation",
        "es": "Continuar a la Confirmación"
    },
    "Criar Rede Wi-Fi": {
        "en": "Create Wi-Fi Network",
        "es": "Crear Red Wi-Fi"
    },
    "Criar backup e desativar IPv6": {
        "en": "Create Backup & Disable IPv6",
        "es": "Crear Respaldo y Desactivar IPv6"
    },
    "Criar backup e remover": {
        "en": "Create Backup & Remove",
        "es": "Crear Respaldo y Eliminar"
    },
    "DHCP começa em": {
        "en": "DHCP Start IP",
        "es": "IP Inicial DHCP"
    },
    "Salvar prioridade": {
        "en": "Save Priority",
        "es": "Guardar Prioridad"
    },
    "⚪ Sem Prioridade": {
        "en": "⚪ No Priority",
        "es": "⚪ Sin Prioridad"
    },
    "Salvar nova senha": {
        "en": "Save New Password",
        "es": "Guardar Nueva Contraseña"
    },
    "Para conexões onde o usuário e a senha de fibra são autenticados diretamente neste roteador.": {
        "en": "For connections where fiber ISP username and password authenticate directly on this router.",
        "es": "Para conexiones donde el usuario y la contraseña de fibra se autentican directamente en este router."
    },
    "Para antenas Starlink, roteadores 4G/5G ou modems celulares com latência dinâmica.": {
        "en": "For Starlink dishes, 4G/5G gateways, or cellular modems with variable latency.",
        "es": "Para antenas Starlink, routers 4G/5G o módems celulares con latencia variable."
    }
}

def translate_phrase(pt_str):
    # If in exact dictionary
    if pt_str in TECH_TRANSLATIONS:
        return TECH_TRANSLATIONS[pt_str]["en"], TECH_TRANSLATIONS[pt_str]["es"]

    # Rule-based translations for telecom phrases
    s = pt_str.strip()
    
    # Generic replacements table for common telecom words
    # EN
    en = s
    en = re.sub(r'\bDesativado\b', 'Disabled', en, flags=re.I)
    en = re.sub(r'\bAtivado\b', 'Enabled', en, flags=re.I)
    en = re.sub(r'\bConfiguração\b', 'Configuration', en, flags=re.I)
    en = re.sub(r'\bConfigurar\b', 'Configure', en, flags=re.I)
    en = re.sub(r'\bOpcional\b', 'Optional', en, flags=re.I)
    en = re.sub(r'\bSalvar\b', 'Save', en, flags=re.I)
    en = re.sub(r'\bCancelar\b', 'Cancel', en, flags=re.I)
    en = re.sub(r'\bConfirmar\b', 'Confirm', en, flags=re.I)
    en = re.sub(r'\bExcluir\b|\bRemover\b', 'Delete', en, flags=re.I)
    en = re.sub(r'\bEditar\b', 'Edit', en, flags=re.I)
    en = re.sub(r'\bAplicar\b', 'Apply', en, flags=re.I)
    en = re.sub(r'\bReiniciar\b', 'Reboot', en, flags=re.I)
    en = re.sub(r'\bRede\b', 'Network', en, flags=re.I)
    en = re.sub(r'\bPorta\b', 'Port', en, flags=re.I)
    en = re.sub(r'\bDispositivo\b|\bDispositivos\b', 'Device(s)', en, flags=re.I)
    en = re.sub(r'\bVelocidade\b', 'Speed', en, flags=re.I)
    en = re.sub(r'\bPrioridade\b', 'Priority', en, flags=re.I)
    en = re.sub(r'\bUsuário\b', 'User', en, flags=re.I)
    en = re.sub(r'\bSenha\b', 'Password', en, flags=re.I)
    en = re.sub(r'\bConexão\b', 'Connection', en, flags=re.I)
    en = re.sub(r'\bSucesso\b', 'Success', en, flags=re.I)
    en = re.sub(r'\bFalha\b|\bErro\b', 'Error', en, flags=re.I)
    en = re.sub(r'\bAviso\b|\bAtenção\b', 'Notice', en, flags=re.I)
    en = re.sub(r'\bModo\b', 'Mode', en, flags=re.I)
    en = re.sub(r'\bPerfil\b', 'Profile', en, flags=re.I)

    # ES
    es = s
    es = re.sub(r'\bDesativado\b', 'Desactivado', es, flags=re.I)
    es = re.sub(r'\bAtivado\b', 'Activado', es, flags=re.I)
    es = re.sub(r'\bConfiguração\b', 'Configuración', es, flags=re.I)
    es = re.sub(r'\bConfigurar\b', 'Configurar', es, flags=re.I)
    es = re.sub(r'\bOpcional\b', 'Opcional', es, flags=re.I)
    es = re.sub(r'\bSalvar\b', 'Guardar', es, flags=re.I)
    es = re.sub(r'\bCancelar\b', 'Cancelar', es, flags=re.I)
    es = re.sub(r'\bConfirmar\b', 'Confirmar', es, flags=re.I)
    es = re.sub(r'\bExcluir\b|\bRemover\b', 'Eliminar', es, flags=re.I)
    es = re.sub(r'\bEditar\b', 'Editar', es, flags=re.I)
    es = re.sub(r'\bAplicar\b', 'Aplicar', es, flags=re.I)
    es = re.sub(r'\bReiniciar\b', 'Reiniciar', es, flags=re.I)
    es = re.sub(r'\bRede\b', 'Red', es, flags=re.I)
    es = re.sub(r'\bPorta\b', 'Puerto', es, flags=re.I)
    es = re.sub(r'\bDispositivo\b|\bDispositivos\b', 'Dispositivo(s)', es, flags=re.I)
    es = re.sub(r'\bVelocidade\b', 'Velocidad', es, flags=re.I)
    es = re.sub(r'\bPrioridade\b', 'Prioridad', es, flags=re.I)
    es = re.sub(r'\bUsuário\b', 'Usuario', es, flags=re.I)
    es = re.sub(r'\bSenha\b', 'Contraseña', es, flags=re.I)
    es = re.sub(r'\bConexão\b', 'Conexión', es, flags=re.I)
    es = re.sub(r'\bSucesso\b', 'Éxito', es, flags=re.I)
    es = re.sub(r'\bFalha\b|\bErro\b', 'Error', es, flags=re.I)
    es = re.sub(r'\bAviso\b|\bAtenção\b', 'Aviso', es, flags=re.I)
    es = re.sub(r'\bModo\b', 'Modo', es, flags=re.I)
    es = re.sub(r'\bPerfil\b', 'Perfil', es, flags=re.I)

    return en, es

def run_translation():
    en_existing = get_existing_keys(EN_PO)
    es_existing = get_existing_keys(ES_PO)

    catalog_path = os.path.join(REPO_DIR, "docs", "truly_missing_to_translate.json")
    if not os.path.isfile(catalog_path):
        print("Arquivo de catálogo não encontrado!")
        return

    with open(catalog_path, "r", encoding="utf-8") as f:
        missing_dict = json.load(f)

    # Injeta primeiro os conhecidos da tabela técnica
    added_count = 0
    en_lines = []
    es_lines = []

    for pt_str, meta in missing_dict.items():
        if pt_str not in en_existing:
            en_trans, es_trans = translate_phrase(pt_str)
            
            # Format PO block
            en_lines.append(f'\nmsgid "{pt_str}"\nmsgstr "{en_trans}"\n')
            es_lines.append(f'\nmsgid "{pt_str}"\nmsgstr "{es_trans}"\n')
            added_count += 1

    if en_lines:
        with open(EN_PO, "a", encoding="utf-8") as f:
            f.writelines(en_lines)
        with open(ES_PO, "a", encoding="utf-8") as f:
            f.writelines(es_lines)

    print(f"[OK] Injetadas com sucesso {added_count} traduções técnicas em po/en/ark.po e po/es/ark.po!")

if __name__ == "__main__":
    run_translation()
